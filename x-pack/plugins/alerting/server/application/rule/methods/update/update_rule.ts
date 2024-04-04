/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEqual, omit } from 'lodash';
import { SavedObject } from '@kbn/core/server';
import { SanitizedRule, RawRule } from '../../../../types';
import {
  validateRuleTypeParams,
  validateSystemActions,
  getRuleNotifyWhenType,
} from '../../../../lib';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { parseDuration, getRuleCircuitBreakerErrorMessage } from '../../../../../common';
import { getMappedParams } from '../../../../rules_client/common/mapped_params_utils';
import { retryIfConflicts } from '../../../../lib/retry_if_conflicts';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import {
  RulesClientContext,
  NormalizedAlertActionWithGeneratedValues,
} from '../../../../rules_client/types';
import {
  validateActions,
  extractReferences,
  addGeneratedActionValues,
  incrementRevision,
  createNewAPIKeySet,
  migrateLegacyActions,
  updateMetaAttributes,
} from '../../../../rules_client/lib';
import { RuleParams } from '../../types';
import type { UpdateRuleData } from './types';
import { createRuleSo, getDecryptedRuleSo, getRuleSo } from '../../../../data/rule';

import { validateScheduleLimit, ValidateScheduleLimitResult } from '../get_schedule_frequency';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { updateRuleDataSchema } from './schemas';
import { RuleAttributes } from '../../../../data/rule/types';
import { transformRuleAttributesToRuleDomain, transformRuleDomainToRule } from '../../transforms';
import { ruleDomainSchema } from '../../schemas';

type ShouldIncrementRevision = (params?: RuleParams) => boolean;

export interface UpdateRuleParams<Params extends RuleParams = never> {
  id: string;
  data: UpdateRuleData<Params>;
  allowMissingConnectorSecrets?: boolean;
  shouldIncrementRevision?: ShouldIncrementRevision;
}

export async function updateRule<Params extends RuleParams = never>(
  context: RulesClientContext,
  updateParams: UpdateRuleParams<Params>
): Promise<SanitizedRule<Params>> {
  return await retryIfConflicts(
    context.logger,
    `rulesClient.update('${updateParams.id}')`,
    async () => await updateWithOCC<Params>(context, updateParams)
  );
}

async function updateWithOCC<Params extends RuleParams = never>(
  context: RulesClientContext,
  updateParams: UpdateRuleParams<Params>
  // TODO (http-versioning): This should be of type Rule, change this when all rule types are fixed
): Promise<SanitizedRule<Params>> {
  const {
    data: initialData,
    allowMissingConnectorSecrets,
    id,
    shouldIncrementRevision = () => true,
  } = updateParams;

  // Validate update rule data schema
  try {
    updateRuleDataSchema.validate(initialData);
  } catch (error) {
    throw Boom.badRequest(`Error validating update data - ${error.message}`);
  }

  let originalRuleSavedObject: SavedObject<RuleAttributes>;

  try {
    originalRuleSavedObject = await getDecryptedRuleSo({
      id,
      encryptedSavedObjectsClient: context.encryptedSavedObjectsClient,
      savedObjectsGetOptions: {
        namespace: context.namespace,
      },
    });
  } catch (e) {
    // We'll skip invalidating the API key since we failed to load the decrypted saved object
    context.logger.error(
      `update(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
    );
    // Still attempt to load the object using SOC
    originalRuleSavedObject = await getRuleSo({
      id,
      savedObjectsClient: context.unsecuredSavedObjectsClient,
    });
  }

  const { actions: genActions, systemActions: genSystemActions } = await addGeneratedActionValues(
    initialData.actions,
    initialData.systemActions,
    context
  );

  const data = {
    ...initialData,
    actions: genActions,
    systemActions: genSystemActions,
  };

  const { alertTypeId, consumer, enabled, schedule, name, apiKey, apiKeyCreatedByUser } =
    originalRuleSavedObject.attributes;

  let validationPayload: ValidateScheduleLimitResult = null;
  if (enabled && schedule.interval !== data.schedule.interval) {
    validationPayload = await validateScheduleLimit({
      context,
      prevInterval: schedule?.interval,
      updatedInterval: data.schedule.interval,
    });
  }

  if (validationPayload) {
    throw Boom.badRequest(
      getRuleCircuitBreakerErrorMessage({
        name,
        interval: validationPayload.interval,
        intervalAvailable: validationPayload.intervalAvailable,
        action: 'update',
      })
    );
  }

  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: alertTypeId,
      consumer,
      operation: WriteOperations.Update,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.UPDATE,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.UPDATE,
      outcome: 'unknown',
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
    })
  );

  context.ruleTypeRegistry.ensureRuleTypeEnabled(originalRuleSavedObject.attributes.alertTypeId);
  const ruleType = context.ruleTypeRegistry.get(originalRuleSavedObject.attributes.alertTypeId);

  // Validate Rule types and actions
  const actionsClient = await context.getActionsClient();

  const validatedRuleTypeParams = validateRuleTypeParams(data.params, ruleType.validate.params);
  await validateActions(context, ruleType, data, allowMissingConnectorSecrets);
  await validateSystemActions({
    actionsClient,
    connectorAdapterRegistry: context.connectorAdapterRegistry,
    systemActions: data.systemActions,
  });

  // Throw error if schedule interval is less than the minimum and we are enforcing it
  const intervalInMs = parseDuration(data.schedule.interval);
  if (
    intervalInMs < context.minimumScheduleIntervalInMs &&
    context.minimumScheduleInterval.enforce
  ) {
    throw Boom.badRequest(
      `Error updating rule: the interval is less than the allowed minimum interval of ${context.minimumScheduleInterval.value}`
    );
  }

  const updateResult = await updateRuleAttributes<Params>({
    context,
    updateRuleData: data as UpdateRuleData<Params>,
    validatedRuleTypeParams: validatedRuleTypeParams as Params,
    originalRuleSavedObject,
    shouldIncrementRevision,
    isSystemAction: (connectorId: string) => actionsClient.isSystemAction(connectorId),
  });

  // Log warning if schedule interval is less than the minimum but we're not enforcing it
  if (
    intervalInMs < context.minimumScheduleIntervalInMs &&
    !context.minimumScheduleInterval.enforce
  ) {
    context.logger.warn(
      `Rule schedule interval (${data.schedule.interval}) for "${ruleType.id}" rule type with ID "${id}" is less than the minimum value (${context.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent such changes.`
    );
  }

  await Promise.all([
    apiKey && !apiKeyCreatedByUser
      ? bulkMarkApiKeysForInvalidation(
          { apiKeys: [apiKey] },
          context.logger,
          context.unsecuredSavedObjectsClient
        )
      : null,
    (async () => {
      if (
        updateResult.scheduledTaskId &&
        updateResult.schedule &&
        !isEqual(schedule, updateResult.schedule)
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

  return updateResult;
}

async function updateRuleAttributes<Params extends RuleParams = never>({
  context,
  updateRuleData,
  validatedRuleTypeParams,
  originalRuleSavedObject,
  shouldIncrementRevision,
  isSystemAction,
}: {
  context: RulesClientContext;
  updateRuleData: UpdateRuleData<Params>;
  originalRuleSavedObject: SavedObject<RuleAttributes>;
  validatedRuleTypeParams: Params;
  shouldIncrementRevision: (params?: Params) => boolean;
  isSystemAction: (connectorId: string) => boolean;
  // TODO (http-versioning): This should be of type Rule, change this when all rule types are fixed
}): Promise<SanitizedRule<Params>> {
  const originalRule = originalRuleSavedObject.attributes;
  let updatedRule = { ...originalRule };

  const allActions = [...updateRuleData.actions, ...(updateRuleData.systemActions ?? [])];
  const ruleType = context.ruleTypeRegistry.get(updatedRule.alertTypeId);

  // Extract saved object references for this rule
  const {
    references: extractedReferences,
    params: updatedParams,
    actions: actionsWithRefs,
  } = await extractReferences(
    context,
    ruleType,
    allActions as NormalizedAlertActionWithGeneratedValues[],
    validatedRuleTypeParams
  );

  // Increment revision if applicable field has changed
  const revision = shouldIncrementRevision(updatedParams as Params)
    ? incrementRevision<Params>({
        originalRule,
        updateRuleData,
        updatedParams,
      })
    : originalRule.revision;

  // TODO (http-versioning) Remove RawRuleAction and RawRule casts
  const migratedActions = await migrateLegacyActions(context, {
    ruleId: originalRuleSavedObject.id,
    attributes: originalRule as RawRule,
  });

  if (migratedActions.hasLegacyActions) {
    updatedRule = {
      ...updatedRule,
      notifyWhen: undefined,
      throttle: undefined,
    };
  }

  const username = await context.getUserName();

  const apiKeyAttributes = await createNewAPIKeySet(context, {
    id: ruleType.id,
    ruleName: updateRuleData.name,
    username,
    shouldUpdateApiKey: originalRule.enabled,
    errorMessage: 'Error updating rule: could not create API key',
  });

  const notifyWhen = getRuleNotifyWhenType(
    updateRuleData.notifyWhen ?? null,
    updateRuleData.throttle ?? null
  );

  const updatedRuleAttributes = updateMetaAttributes(context, {
    ...updatedRule,
    ...omit(updateRuleData, 'actions', 'systemActions'),
    ...apiKeyAttributes,
    params: updatedParams as RawRule['params'],
    actions: actionsWithRefs,
    notifyWhen,
    revision,
    updatedBy: username,
    updatedAt: new Date().toISOString(),
  });

  const mappedParams = getMappedParams(updatedParams);

  if (Object.keys(mappedParams).length) {
    updatedRuleAttributes.mapped_params = mappedParams;
  }

  let updatedRuleSavedObject: SavedObject<RuleAttributes>;

  const { id, version } = originalRuleSavedObject;
  try {
    updatedRuleSavedObject = await createRuleSo({
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      ruleAttributes: updatedRuleAttributes,
      savedObjectsCreateOptions: {
        id,
        version,
        overwrite: true,
        references: extractedReferences,
      },
    });
  } catch (e) {
    // Avoid unused API key
    await bulkMarkApiKeysForInvalidation(
      {
        apiKeys:
          updatedRuleAttributes.apiKey && !updatedRuleAttributes.apiKeyCreatedByUser
            ? [updatedRuleAttributes.apiKey]
            : [],
      },
      context.logger,
      context.unsecuredSavedObjectsClient
    );

    throw e;
  }

  const ruleDomain = transformRuleAttributesToRuleDomain<Params>(
    updatedRuleSavedObject.attributes,
    {
      id: updatedRuleSavedObject.id,
      logger: context.logger,
      ruleType,
      references: updatedRuleSavedObject.references,
    },
    isSystemAction
  );

  // Try to validate created rule, but don't throw.
  try {
    ruleDomainSchema.validate(ruleDomain);
  } catch (e) {
    context.logger.warn(`Error validating updated rule domain object for id: ${id}, ${e}`);
  }

  // Convert domain rule to rule (Remove certain properties)
  const rule = transformRuleDomainToRule<Params>(ruleDomain, { isPublic: true });

  // TODO (http-versioning): Remove this cast, this enables us to move forward
  // without fixing all of other solution types
  return rule as SanitizedRule<Params>;
}
