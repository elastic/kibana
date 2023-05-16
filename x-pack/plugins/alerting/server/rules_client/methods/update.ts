/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { SavedObject } from '@kbn/core/server';
import type { ShouldIncrementRevision } from './bulk_edit';
import {
  PartialRule,
  RawRule,
  RuleTypeParams,
  RuleNotifyWhenType,
  IntervalSchedule,
} from '../../types';
import { WriteOperations } from '../../authorization';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { NormalizedAlertAction, RulesClientContext } from '../types';
import { getPartialRuleFromRaw, rulesUpdateFlow } from '../lib';

export interface UpdateOptions<Params extends RuleTypeParams> {
  id: string;
  data: {
    name: string;
    tags: string[];
    schedule: IntervalSchedule;
    actions: NormalizedAlertAction[];
    params: Params;
    throttle?: string | null;
    notifyWhen?: RuleNotifyWhenType | null;
  };
  allowMissingConnectorSecrets?: boolean;
  shouldIncrementRevision?: ShouldIncrementRevision<Params>;
}

export async function update<Params extends RuleTypeParams = never>(
  context: RulesClientContext,
  { id, data, allowMissingConnectorSecrets, shouldIncrementRevision }: UpdateOptions<Params>
): Promise<PartialRule<Params>> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.update('${id}')`,
    async () =>
      await updateWithOCC<Params>(context, {
        id,
        data,
        allowMissingConnectorSecrets,
        shouldIncrementRevision,
      })
  );
}

async function updateWithOCC<Params extends RuleTypeParams>(
  context: RulesClientContext,
  { id, data, allowMissingConnectorSecrets, shouldIncrementRevision }: UpdateOptions<Params>
): Promise<PartialRule<Params>> {
  let alertSavedObject: SavedObject<RawRule>;

  try {
    alertSavedObject =
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>('alert', id, {
        namespace: context.namespace,
      });
  } catch (e) {
    // We'll skip invalidating the API key since we failed to load the decrypted saved object
    context.logger.error(
      `update(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
    );
    // Still attempt to load the object using SOC
    alertSavedObject = await context.unsecuredSavedObjectsClient.get<RawRule>('alert', id);
  }

  const { attributes: originalAttributes, version } = alertSavedObject;
  const { actions, params, ...restData } = data;

  const {
    prepareRuleForUpdate,
    ensureAuthorizedAndRuleTypeEnabled,
    updateAction,
    updateParams,
    extractReferencesFromParamsAndActions,
    createAPIKey,
    updateAttributes,
    maybeIncrementRevision,
    validateAttributes,
    cleanup,
    getUpdatedAttributeAndRefsForSaving,
  } = rulesUpdateFlow(context);

  await prepareRuleForUpdate(id, alertSavedObject);

  await ensureAuthorizedAndRuleTypeEnabled(id, {
    operation: WriteOperations.Update,
    action: RuleAuditAction.UPDATE,
  });

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UPDATE,
      outcome: 'unknown',
      savedObject: { type: 'alert', id },
    })
  );

  await updateAction(id, {
    actions: data.actions,
    allowMissingConnectorSecrets,
  });

  await updateParams(id, {
    params: data.params,
  });

  await extractReferencesFromParamsAndActions(id);

  await createAPIKey(id);

  await updateAttributes(id, { ...restData });

  await maybeIncrementRevision(id);

  await validateAttributes(id);

  const { attributes: updatedAttributes, references } = await getUpdatedAttributeAndRefsForSaving(
    id
  );

  let updatedObject: SavedObject<RawRule>;

  try {
    updatedObject = await context.unsecuredSavedObjectsClient.create<RawRule>(
      'alert',
      updatedAttributes,
      {
        id,
        overwrite: true,
        version,
        references,
      }
    );
  } catch (e) {
    // Avoid unused API key
    await cleanup();
    throw e;
  }

  const ruleType = context.ruleTypeRegistry.get(originalAttributes.alertTypeId);

  const updateResult = getPartialRuleFromRaw(
    context,
    id,
    ruleType,
    updatedObject.attributes,
    updatedObject.references,
    false,
    true
  );

  await Promise.all([
    alertSavedObject.attributes.apiKey && !alertSavedObject.attributes.apiKeyCreatedByUser
      ? cleanup()
      : null,
    (async () => {
      if (
        updateResult.scheduledTaskId &&
        updateResult.schedule &&
        !isEqual(alertSavedObject.attributes.schedule, updateResult.schedule)
      ) {
        try {
          const { tasks } = await context.taskManager.bulkUpdateSchedules(
            [updateResult.scheduledTaskId],
            updateResult.schedule
          );

          context.logger.debug(
            `Rule update has rescheduled the underlying task: ${updateResult.scheduledTaskId} to run at: ${tasks?.[0]?.runAt}`
          );
        } catch (err) {
          context.logger.error(
            `Rule update failed to run its underlying task. TaskManager bulkUpdateSchedules failed with Error: ${err.message}`
          );
        }
      }
    })(),
  ]);

  return updateResult as PartialRule<Params>;
}
