/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isEqual } from 'lodash';
import { SavedObject } from '@kbn/core/server';
import {
  PartialRule,
  RawRule,
  RuleTypeParams,
  RuleNotifyWhenType,
  IntervalSchedule,
} from '../../types';
import { validateRuleTypeParams, getRuleNotifyWhenType } from '../../lib';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { parseDuration, getRuleCircuitBreakerErrorMessage, AlertDelay } from '../../../common';
import { retryIfConflicts } from '../../lib/retry_if_conflicts';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { getMappedParams } from '../common/mapped_params_utils';
import { NormalizedAlertAction, NormalizedSystemAction, RulesClientContext } from '../types';
import {
  validateActions,
  extractReferences,
  updateMeta,
  getPartialRuleFromRaw,
  addGeneratedActionValues,
  incrementRevision,
  createNewAPIKeySet,
  migrateLegacyActions,
} from '../lib';
import {
  validateScheduleLimit,
  ValidateScheduleLimitResult,
} from '../../application/rule/methods/get_schedule_frequency';
import { validateAndAuthorizeSystemActions } from '../../lib/validate_authorize_system_actions';
import { transformRawActionsToDomainActions } from '../../application/rule/transforms';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { transformRawActionsToDomainSystemActions } from '../../application/rule/transforms/transform_raw_actions_to_domain_actions';

type ShouldIncrementRevision = (params?: RuleTypeParams) => boolean;

export interface UpdateOptions<Params extends RuleTypeParams> {
  id: string;
  data: {
    name: string;
    tags: string[];
    schedule: IntervalSchedule;
    actions: NormalizedAlertAction[];
    systemActions?: NormalizedSystemAction[];
    params: Params;
    throttle?: string | null;
    notifyWhen?: RuleNotifyWhenType | null;
    alertDelay?: AlertDelay;
  };
  allowMissingConnectorSecrets?: boolean;
  shouldIncrementRevision?: ShouldIncrementRevision;
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
      await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
        RULE_SAVED_OBJECT_TYPE,
        id,
        {
          namespace: context.namespace,
        }
      );
  } catch (e) {
    // We'll skip invalidating the API key since we failed to load the decrypted saved object
    context.logger.error(
      `update(): Failed to load API key to invalidate on alert ${id}: ${e.message}`
    );
    // Still attempt to load the object using SOC
    alertSavedObject = await context.unsecuredSavedObjectsClient.get<RawRule>(
      RULE_SAVED_OBJECT_TYPE,
      id
    );
  }

  const {
    attributes: { enabled, schedule, name },
  } = alertSavedObject;

  let validationPayload: ValidateScheduleLimitResult = null;
  if (enabled && schedule.interval !== data.schedule.interval) {
    validationPayload = await validateScheduleLimit({
      context,
      prevInterval: alertSavedObject.attributes.schedule?.interval,
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
      ruleTypeId: alertSavedObject.attributes.alertTypeId,
      consumer: alertSavedObject.attributes.consumer,
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

  context.ruleTypeRegistry.ensureRuleTypeEnabled(alertSavedObject.attributes.alertTypeId);

  const migratedActions = await migrateLegacyActions(context, {
    ruleId: id,
    attributes: alertSavedObject.attributes,
  });

  const updateResult = await updateAlert<Params>(
    context,
    { id, data, allowMissingConnectorSecrets, shouldIncrementRevision },
    migratedActions.hasLegacyActions
      ? {
          ...alertSavedObject,
          attributes: {
            ...alertSavedObject.attributes,
            notifyWhen: undefined,
            throttle: undefined,
          },
        }
      : alertSavedObject
  );

  await Promise.all([
    alertSavedObject.attributes.apiKey && !alertSavedObject.attributes.apiKeyCreatedByUser
      ? bulkMarkApiKeysForInvalidation(
          { apiKeys: [alertSavedObject.attributes.apiKey] },
          context.logger,
          context.unsecuredSavedObjectsClient
        )
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

  return updateResult;
}

async function updateAlert<Params extends RuleTypeParams>(
  context: RulesClientContext,
  {
    id,
    data: initialData,
    allowMissingConnectorSecrets,
    shouldIncrementRevision = () => true,
  }: UpdateOptions<Params>,
  currentRule: SavedObject<RawRule>
): Promise<PartialRule<Params>> {
  const { attributes, version } = currentRule;
  const { actions: genAction, systemActions: genSystemActions } = await addGeneratedActionValues(
    initialData.actions,
    initialData.systemActions,
    context
  );
  const data = {
    ...initialData,
    actions: genAction,
    systemActions: genSystemActions,
  };
  const actionsClient = await context.getActionsClient();
  const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId);

  try {
    validateActionsSchema(data.actions, data.systemActions);
  } catch (error) {
    throw Boom.badRequest(`Error validating actions - ${error.message}`);
  }

  // Validate
  const validatedAlertTypeParams = validateRuleTypeParams(data.params, ruleType.validate.params);
  await validateActions(context, ruleType, data, allowMissingConnectorSecrets);
  await validateAndAuthorizeSystemActions({
    actionsClient,
    actionsAuthorization: context.actionsAuthorization,
    connectorAdapterRegistry: context.connectorAdapterRegistry,
    systemActions: data.systemActions,
    rule: { consumer: currentRule.attributes.consumer },
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

  const allActions = [...data.actions, ...(data.systemActions ?? [])];
  // Extract saved object references for this rule
  const {
    references,
    params: updatedParams,
    actions: actionsWithRefs,
  } = await extractReferences(context, ruleType, allActions, validatedAlertTypeParams);

  const username = await context.getUserName();

  const apiKeyAttributes = await createNewAPIKeySet(context, {
    id: ruleType.id,
    ruleName: data.name,
    username,
    shouldUpdateApiKey: attributes.enabled,
    errorMessage: 'Error updating rule: could not create API key',
  });
  const notifyWhen = getRuleNotifyWhenType(data.notifyWhen ?? null, data.throttle ?? null);

  // Increment revision if applicable field has changed
  const revision = shouldIncrementRevision(updatedParams)
    ? incrementRevision<Params>(
        currentRule,
        { id, data, allowMissingConnectorSecrets },
        updatedParams
      )
    : currentRule.attributes.revision;

  let updatedObject: SavedObject<RawRule>;
  const { systemActions, ...restData } = data;
  const createAttributes = updateMeta(context, {
    ...attributes,
    ...restData,
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
    createAttributes.mapped_params = mappedParams;
  }

  try {
    updatedObject = await context.unsecuredSavedObjectsClient.create<RawRule>(
      RULE_SAVED_OBJECT_TYPE,
      createAttributes,
      {
        id,
        overwrite: true,
        version,
        references,
      }
    );
  } catch (e) {
    // Avoid unused API key
    await bulkMarkApiKeysForInvalidation(
      {
        apiKeys:
          createAttributes.apiKey && !createAttributes.apiKeyCreatedByUser
            ? [createAttributes.apiKey]
            : [],
      },
      context.logger,
      context.unsecuredSavedObjectsClient
    );

    throw e;
  }

  // Log warning if schedule interval is less than the minimum but we're not enforcing it
  if (
    intervalInMs < context.minimumScheduleIntervalInMs &&
    !context.minimumScheduleInterval.enforce
  ) {
    context.logger.warn(
      `Rule schedule interval (${data.schedule.interval}) for "${ruleType.id}" rule type with ID "${id}" is less than the minimum value (${context.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent such changes.`
    );
  }
  const rules = getPartialRuleFromRaw<Params>(
    context,
    id,
    ruleType,
    updatedObject.attributes,
    updatedObject.references,
    false,
    true
  );

  return {
    ...rules,
    actions: transformRawActionsToDomainActions({
      ruleId: id,
      references: updatedObject.references,
      actions: updatedObject.attributes.actions,
      omitGeneratedValues: false,
      isSystemAction: (connectorId: string) => actionsClient.isSystemAction(connectorId),
    }),
    systemActions: transformRawActionsToDomainSystemActions({
      ruleId: id,
      references: updatedObject.references,
      actions: updatedObject.attributes.actions,
      omitGeneratedValues: false,
      isSystemAction: (connectorId: string) => actionsClient.isSystemAction(connectorId),
    }),
  };
}

/**
 * This is a temporary validation to ensure that actions
 * contain the expected properties. When the method is migrated to
 * use a schema for validation, like the create_rule method, the
 * function should be deleted in favor of the schema validation.
 */
const validateActionsSchema = (
  actions: NormalizedAlertAction[],
  systemActions: NormalizedSystemAction[]
) => {
  for (const action of actions) {
    if (!action.group) {
      // Simulating kbn-schema error message
      throw new Error('[actions.0.group]: expected value of type [string] but got [undefined]');
    }
  }

  for (const systemAction of systemActions) {
    if ('group' in systemAction || 'frequency' in systemAction || 'alertsFilter' in systemAction) {
      // Simulating kbn-schema error message
      throw new Error('definition for this key is missing');
    }
  }
};
