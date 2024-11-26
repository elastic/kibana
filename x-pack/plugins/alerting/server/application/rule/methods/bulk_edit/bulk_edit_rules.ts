/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import Boom from '@hapi/boom';
import { cloneDeep } from 'lodash';
import { KueryNode, nodeBuilder } from '@kbn/es-query';
import {
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkCreateObject,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { validateAndAuthorizeSystemActions } from '../../../../lib/validate_authorize_system_actions';
import { Rule, RuleAction, RuleSystemAction } from '../../../../../common';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { BulkActionSkipResult } from '../../../../../common/bulk_edit';
import { RuleTypeRegistry } from '../../../../types';
import {
  validateRuleTypeParams,
  getRuleNotifyWhenType,
  validateMutatedRuleTypeParams,
  convertRuleIdsToKueryNode,
} from '../../../../lib';
import { WriteOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { parseDuration, getRuleCircuitBreakerErrorMessage } from '../../../../../common';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import {
  retryIfBulkEditConflicts,
  applyBulkEditOperation,
  buildKueryNodeFilter,
  getBulkSnooze,
  getBulkUnsnooze,
  verifySnoozeScheduleLimit,
  injectReferencesIntoActions,
} from '../../../../rules_client/common';
import {
  alertingAuthorizationFilterOpts,
  MAX_RULES_NUMBER_FOR_BULK_OPERATION,
  RULE_TYPE_CHECKS_CONCURRENCY,
  API_KEY_GENERATE_CONCURRENCY,
} from '../../../../rules_client/common/constants';
import { getMappedParams } from '../../../../rules_client/common/mapped_params_utils';
import {
  extractReferences,
  validateActions,
  updateMeta,
  addGeneratedActionValues,
  createNewAPIKeySet,
} from '../../../../rules_client/lib';
import {
  BulkOperationError,
  RuleBulkOperationAggregation,
  RulesClientContext,
  NormalizedAlertActionWithGeneratedValues,
  NormalizedAlertAction,
} from '../../../../rules_client/types';
import { migrateLegacyActions } from '../../../../rules_client/lib';
import {
  BulkEditFields,
  BulkEditOperation,
  BulkEditOptionsFilter,
  BulkEditOptionsIds,
  ParamsModifier,
  ShouldIncrementRevision,
} from './types';
import { RawRuleAction, RawRule, SanitizedRule } from '../../../../types';
import { ruleNotifyWhen } from '../../constants';
import { actionRequestSchema, ruleDomainSchema, systemActionRequestSchema } from '../../schemas';
import { RuleParams, RuleDomain, RuleSnoozeSchedule } from '../../types';
import { findRulesSo, bulkCreateRulesSo } from '../../../../data/rule';
import {
  transformRuleAttributesToRuleDomain,
  transformRuleDomainToRuleAttributes,
  transformRuleDomainToRule,
} from '../../transforms';
import { validateScheduleLimit, ValidateScheduleLimitResult } from '../get_schedule_frequency';

const isValidInterval = (interval: string | undefined): interval is string => {
  return interval !== undefined;
};

export const bulkEditFieldsToExcludeFromRevisionUpdates = new Set(['snoozeSchedule', 'apiKey']);

type ApiKeysMap = Map<
  string,
  {
    oldApiKey?: string;
    newApiKey?: string;
    oldApiKeyCreatedByUser?: boolean | null;
    newApiKeyCreatedByUser?: boolean | null;
  }
>;

type ApiKeyAttributes = Pick<RawRule, 'apiKey' | 'apiKeyOwner' | 'apiKeyCreatedByUser'>;

type RuleType = ReturnType<RuleTypeRegistry['get']>;

// TODO (http-versioning): This should be of type Rule, change this when all rule types are fixed
export interface BulkEditResult<Params extends RuleParams> {
  rules: Array<SanitizedRule<Params>>;
  skipped: BulkActionSkipResult[];
  errors: BulkOperationError[];
  total: number;
}

export type BulkEditOptions<Params extends RuleParams> =
  | BulkEditOptionsFilter<Params>
  | BulkEditOptionsIds<Params>;

export async function bulkEditRules<Params extends RuleParams>(
  context: RulesClientContext,
  options: BulkEditOptions<Params>
): Promise<BulkEditResult<Params>> {
  const queryFilter = (options as BulkEditOptionsFilter<Params>).filter;
  const ids = (options as BulkEditOptionsIds<Params>).ids;
  const actionsClient = await context.getActionsClient();

  if (ids && queryFilter) {
    throw Boom.badRequest(
      "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method arguments"
    );
  }

  const qNodeQueryFilter = buildKueryNodeFilter(queryFilter);

  const qNodeFilter = ids ? convertRuleIdsToKueryNode(ids) : qNodeQueryFilter;
  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter(
      AlertingAuthorizationEntity.Rule,
      alertingAuthorizationFilterOpts
    );
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.BULK_EDIT,
        error,
      })
    );
    throw error;
  }
  const { filter: authorizationFilter } = authorizationTuple;
  const qNodeFilterWithAuth =
    authorizationFilter && qNodeFilter
      ? nodeBuilder.and([qNodeFilter, authorizationFilter as KueryNode])
      : qNodeFilter;

  const { aggregations, total } = await findRulesSo<RuleBulkOperationAggregation>({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsFindOptions: {
      filter: qNodeFilterWithAuth,
      page: 1,
      perPage: 0,
      aggs: {
        alertTypeId: {
          multi_terms: {
            terms: [
              { field: 'alert.attributes.alertTypeId' },
              { field: 'alert.attributes.consumer' },
            ],
          },
        },
      },
    },
  });

  if (total > MAX_RULES_NUMBER_FOR_BULK_OPERATION) {
    throw Boom.badRequest(
      `More than ${MAX_RULES_NUMBER_FOR_BULK_OPERATION} rules matched for bulk edit`
    );
  }
  const buckets = aggregations?.alertTypeId.buckets;

  if (buckets === undefined) {
    throw Error('No rules found for bulk edit');
  }

  await pMap(
    buckets,
    async ({ key: [ruleType, consumer] }) => {
      context.ruleTypeRegistry.ensureRuleTypeEnabled(ruleType);

      try {
        await context.authorization.ensureAuthorized({
          ruleTypeId: ruleType,
          consumer,
          operation: WriteOperations.BulkEdit,
          entity: AlertingAuthorizationEntity.Rule,
        });
      } catch (error) {
        context.auditLogger?.log(
          ruleAuditEvent({
            action: RuleAuditAction.BULK_EDIT,
            error,
          })
        );
        throw error;
      }
    },
    { concurrency: RULE_TYPE_CHECKS_CONCURRENCY }
  );

  const { apiKeysToInvalidate, results, errors, skipped } = await retryIfBulkEditConflicts(
    context.logger,
    `rulesClient.update('operations=${JSON.stringify(options.operations)}, paramsModifier=${
      options.paramsModifier ? '[Function]' : undefined
    }', shouldIncrementRevision=${options.shouldIncrementRevision ? '[Function]' : undefined}')`,
    (filterKueryNode: KueryNode | null) =>
      bulkEditRulesOcc(context, {
        filter: filterKueryNode,
        operations: options.operations,
        paramsModifier: options.paramsModifier,
        shouldIncrementRevision: options.shouldIncrementRevision,
      }),
    qNodeFilterWithAuth
  );

  if (apiKeysToInvalidate.length > 0) {
    await bulkMarkApiKeysForInvalidation(
      { apiKeys: apiKeysToInvalidate },
      context.logger,
      context.unsecuredSavedObjectsClient
    );
  }

  const updatedRules = results.map(({ id, attributes, references }) => {
    // TODO (http-versioning): alertTypeId should never be null, but we need to
    // fix the type cast from SavedObjectsBulkUpdateObject to SavedObjectsBulkUpdateObject
    // when we are doing the bulk create and this should fix itself
    const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId!);
    const ruleDomain = transformRuleAttributesToRuleDomain<Params>(
      attributes as RawRule,
      {
        id,
        logger: context.logger,
        ruleType,
        references,
        omitGeneratedValues: false,
      },
      (connectorId: string) => actionsClient.isSystemAction(connectorId)
    );
    try {
      ruleDomainSchema.validate(ruleDomain);
    } catch (e) {
      context.logger.warn(`Error validating bulk edited rule domain object for id: ${id}, ${e}`);
    }
    return ruleDomain;
  });

  // TODO (http-versioning): This should be of type Rule, change this when all rule types are fixed
  const publicRules = updatedRules.map((rule: RuleDomain<Params>) => {
    return transformRuleDomainToRule<Params>(rule);
  }) as Array<SanitizedRule<Params>>;

  await bulkUpdateSchedules(context, options.operations, updatedRules);

  return { rules: publicRules, skipped, errors, total };
}

async function bulkEditRulesOcc<Params extends RuleParams>(
  context: RulesClientContext,
  {
    filter,
    operations,
    paramsModifier,
    shouldIncrementRevision,
  }: {
    filter: KueryNode | null;
    operations: BulkEditOperation[];
    paramsModifier?: ParamsModifier<Params>;
    shouldIncrementRevision?: ShouldIncrementRevision<Params>;
  }
): Promise<{
  apiKeysToInvalidate: string[];
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  resultSavedObjects: Array<SavedObjectsUpdateResponse<RawRule>>;
  errors: BulkOperationError[];
  skipped: BulkActionSkipResult[];
}> {
  const rulesFinder =
    await context.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>(
      {
        filter,
        type: RULE_SAVED_OBJECT_TYPE,
        perPage: 100,
        ...(context.namespace ? { namespaces: [context.namespace] } : undefined),
      }
    );

  const rules: Array<SavedObjectsBulkUpdateObject<RawRule>> = [];
  const skipped: BulkActionSkipResult[] = [];
  const errors: BulkOperationError[] = [];
  const apiKeysMap: ApiKeysMap = new Map();
  const username = await context.getUserName();
  const prevInterval: string[] = [];

  for await (const response of rulesFinder.find()) {
    const intervals = response.saved_objects
      .filter((rule) => rule.attributes.enabled)
      .map((rule) => rule.attributes.schedule?.interval)
      .filter(isValidInterval);

    prevInterval.concat(intervals);

    await pMap(
      response.saved_objects,
      async (rule: SavedObjectsFindResult<RawRule>) =>
        updateRuleAttributesAndParamsInMemory({
          context,
          rule,
          operations,
          paramsModifier,
          apiKeysMap,
          rules,
          skipped,
          errors,
          username,
          shouldIncrementRevision,
        }),
      { concurrency: API_KEY_GENERATE_CONCURRENCY }
    );
  }
  await rulesFinder.close();

  const updatedInterval = rules
    .filter((rule) => rule.attributes.enabled)
    .map((rule) => rule.attributes.schedule?.interval)
    .filter(isValidInterval);

  let validationPayload: ValidateScheduleLimitResult = null;
  if (operations.some((operation) => operation.field === 'schedule')) {
    validationPayload = await validateScheduleLimit({
      context,
      prevInterval,
      updatedInterval,
    });
  }

  if (validationPayload) {
    return {
      apiKeysToInvalidate: Array.from(apiKeysMap.values())
        .filter((value) => value.newApiKey)
        .map((value) => value.newApiKey as string),
      resultSavedObjects: [],
      rules: [],
      errors: rules.map((rule) => ({
        message: getRuleCircuitBreakerErrorMessage({
          name: rule.attributes.name || 'n/a',
          interval: validationPayload!.interval,
          intervalAvailable: validationPayload!.intervalAvailable,
          action: 'bulkEdit',
          rules: updatedInterval.length,
        }),
        rule: {
          id: rule.id,
          name: rule.attributes.name || 'n/a',
        },
      })),
      skipped: [],
    };
  }
  const { result, apiKeysToInvalidate } =
    rules.length > 0
      ? await saveBulkUpdatedRules({
          context,
          rules,
          apiKeysMap,
        })
      : {
          result: { saved_objects: [] },
          apiKeysToInvalidate: [],
        };

  return {
    apiKeysToInvalidate,
    resultSavedObjects: result.saved_objects,
    errors,
    rules,
    skipped,
  };
}

async function bulkUpdateSchedules<Params extends RuleParams>(
  context: RulesClientContext,
  operations: BulkEditOperation[],
  updatedRules: Array<RuleDomain<Params>>
): Promise<void> {
  const scheduleOperation = operations.find(
    (
      operation
    ): operation is Extract<BulkEditOperation, { field: Extract<BulkEditFields, 'schedule'> }> =>
      operation.field === 'schedule'
  );

  if (!scheduleOperation?.value) {
    return;
  }
  const taskIds = updatedRules.reduce<string[]>((acc, rule) => {
    if (rule.scheduledTaskId) {
      acc.push(rule.scheduledTaskId);
    }
    return acc;
  }, []);

  try {
    await context.taskManager.bulkUpdateSchedules(taskIds, scheduleOperation.value);
    context.logger.debug(
      `Successfully updated schedules for underlying tasks: ${taskIds.join(', ')}`
    );
  } catch (error) {
    context.logger.error(
      `Failure to update schedules for underlying tasks: ${taskIds.join(
        ', '
      )}. TaskManager bulkUpdateSchedules failed with Error: ${error.message}`
    );
  }
}

async function updateRuleAttributesAndParamsInMemory<Params extends RuleParams>({
  context,
  rule,
  operations,
  paramsModifier,
  apiKeysMap,
  rules,
  skipped,
  errors,
  username,
  shouldIncrementRevision = () => true,
}: {
  context: RulesClientContext;
  rule: SavedObjectsFindResult<RawRule>;
  operations: BulkEditOperation[];
  paramsModifier?: ParamsModifier<Params>;
  apiKeysMap: ApiKeysMap;
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  skipped: BulkActionSkipResult[];
  errors: BulkOperationError[];
  username: string | null;
  shouldIncrementRevision?: ShouldIncrementRevision<Params>;
}): Promise<void> {
  try {
    if (rule.attributes.apiKey) {
      apiKeysMap.set(rule.id, {
        oldApiKey: rule.attributes.apiKey,
        oldApiKeyCreatedByUser: rule.attributes.apiKeyCreatedByUser,
      });
    }

    const ruleType = context.ruleTypeRegistry.get(rule.attributes.alertTypeId);

    await ensureAuthorizationForBulkUpdate(context, operations, rule);

    // migrate legacy actions only for SIEM rules
    // TODO (http-versioning) Remove RawRuleAction and RawRule casts
    const migratedActions = await migrateLegacyActions(context, {
      ruleId: rule.id,
      actions: rule.attributes.actions as RawRuleAction[],
      references: rule.references,
      attributes: rule.attributes as RawRule,
    });

    if (migratedActions.hasLegacyActions) {
      rule.attributes.actions = migratedActions.resultedActions;
      rule.references = migratedActions.resultedReferences;
    }

    const ruleActions = injectReferencesIntoActions(
      rule.id,
      rule.attributes.actions || [],
      rule.references || []
    );

    const ruleDomain: RuleDomain<Params> = transformRuleAttributesToRuleDomain<Params>(
      rule.attributes,
      {
        id: rule.id,
        logger: context.logger,
        ruleType: context.ruleTypeRegistry.get(rule.attributes.alertTypeId),
        references: rule.references,
      },
      context.isSystemAction
    );

    const {
      rule: updatedRule,
      ruleActions: updatedRuleActions,
      hasUpdateApiKeyOperation,
      isAttributesUpdateSkipped,
    } = await getUpdatedAttributesFromOperations<Params>({
      context,
      operations,
      rule: ruleDomain,
      ruleActions,
      ruleType,
    });

    validateScheduleInterval(context, updatedRule.schedule.interval, ruleType.id, rule.id);

    const { modifiedParams: ruleParams, isParamsUpdateSkipped } = paramsModifier
      ? // TODO (http-versioning): Remove the cast when all rule types are fixed
        await paramsModifier(updatedRule as Rule<Params>)
      : {
          modifiedParams: updatedRule.params,
          isParamsUpdateSkipped: true,
        };

    // Increment revision if params ended up being modified AND it wasn't already incremented as part of attribute update
    if (
      shouldIncrementRevision(ruleParams) &&
      !isParamsUpdateSkipped &&
      rule.attributes.revision === updatedRule.revision
    ) {
      updatedRule.revision += 1;
    }

    // If neither attributes nor parameters were updated, mark
    // the rule as skipped and continue to the next rule.
    if (isAttributesUpdateSkipped && isParamsUpdateSkipped) {
      skipped.push({
        id: rule.id,
        name: rule.attributes.name,
        skip_reason: 'RULE_NOT_MODIFIED',
      });
      return;
    }

    // validate rule params
    const validatedAlertTypeParams = validateRuleTypeParams(ruleParams, ruleType.validate.params);
    const validatedMutatedAlertTypeParams = validateMutatedRuleTypeParams(
      validatedAlertTypeParams,
      rule.attributes.params,
      ruleType.validate.params
    );

    const {
      references,
      params: updatedParams,
      actions: actionsWithRefs,
    } = await extractReferences(
      context,
      ruleType,
      updatedRuleActions as NormalizedAlertActionWithGeneratedValues[],
      validatedMutatedAlertTypeParams
    );

    const ruleAttributes = transformRuleDomainToRuleAttributes({
      actionsWithRefs,
      rule: updatedRule,
      params: {
        legacyId: rule.attributes.legacyId,
        paramsWithRefs: updatedParams,
      },
    });

    const { apiKeyAttributes } = await prepareApiKeys(
      context,
      rule,
      ruleType,
      apiKeysMap,
      ruleAttributes,
      hasUpdateApiKeyOperation,
      username
    );

    const { updatedAttributes } = updateAttributes(
      context,
      ruleAttributes,
      apiKeyAttributes,
      updatedParams,
      ruleAttributes.actions,
      username
    );

    rules.push({
      ...rule,
      references,
      attributes: updatedAttributes,
    });
  } catch (error) {
    errors.push({
      message: error.message,
      rule: {
        id: rule.id,
        name: rule.attributes?.name,
      },
    });
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.BULK_EDIT,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: rule.id, name: rule.attributes?.name },
        error,
      })
    );
  }
}

async function ensureAuthorizationForBulkUpdate(
  context: RulesClientContext,
  operations: BulkEditOperation[],
  rule: SavedObjectsFindResult<RawRule>
): Promise<void> {
  if (rule.attributes.actions.length === 0) {
    return;
  }

  for (const operation of operations) {
    const { field } = operation;
    if (field === 'snoozeSchedule' || field === 'apiKey') {
      try {
        await context.actionsAuthorization.ensureAuthorized({ operation: 'execute' });
        break;
      } catch (error) {
        throw Error(`Rule not authorized for bulk ${field} update - ${error.message}`);
      }
    }
  }
}

async function getUpdatedAttributesFromOperations<Params extends RuleParams>({
  context,
  operations,
  rule,
  ruleActions,
  ruleType,
}: {
  context: RulesClientContext;
  operations: BulkEditOperation[];
  rule: RuleDomain<Params>;
  ruleActions: RuleDomain['actions'] | RuleDomain['systemActions'];
  ruleType: RuleType;
}) {
  const actionsClient = await context.getActionsClient();

  let updatedRule = cloneDeep(rule);
  let updatedRuleActions = ruleActions;
  let hasUpdateApiKeyOperation = false;
  let isAttributesUpdateSkipped = true;

  for (const operation of operations) {
    // Check if the update should be skipped for the current action.
    // If it should, save the skip reasons in attributesUpdateSkipReasons
    // and continue to the next operation before without
    // the `isAttributesUpdateSkipped` flag to false.
    switch (operation.field) {
      case 'actions': {
        const systemActions = operation.value.filter((action): action is RuleSystemAction =>
          actionsClient.isSystemAction(action.id)
        );
        const actions = operation.value.filter(
          (action): action is RuleAction => !actionsClient.isSystemAction(action.id)
        );

        systemActions.forEach((systemAction) => {
          try {
            systemActionRequestSchema.validate(systemAction);
          } catch (error) {
            throw Boom.badRequest(`Error validating bulk edit rules operations - ${error.message}`);
          }
        });

        actions.forEach((action) => {
          try {
            actionRequestSchema.validate(action);
          } catch (error) {
            throw Boom.badRequest(`Error validating bulk edit rules operations - ${error.message}`);
          }
        });

        const { actions: genActions, systemActions: genSystemActions } =
          await addGeneratedActionValues(actions, systemActions, context);
        const updatedOperation = {
          ...operation,
          value: [...genActions, ...genSystemActions],
        };

        await validateAndAuthorizeSystemActions({
          actionsClient,
          actionsAuthorization: context.actionsAuthorization,
          connectorAdapterRegistry: context.connectorAdapterRegistry,
          systemActions: genSystemActions,
          rule: { consumer: updatedRule.consumer, producer: ruleType.producer },
        });

        try {
          await validateActions(context, ruleType, {
            ...updatedRule,
            actions: genActions,
            systemActions: genSystemActions,
          });
        } catch (e) {
          // If validateActions fails on the first attempt, it may be because of legacy rule-level frequency params
          updatedRule = await attemptToMigrateLegacyFrequency(
            context,
            operation.field,
            genActions,
            updatedRule,
            ruleType
          );
        }

        const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
          updatedOperation,
          {
            actions: updatedRuleActions,
          }
        );
        if (isAttributeModified) {
          updatedRuleActions = modifiedAttributes.actions;
          isAttributesUpdateSkipped = false;
        }

        break;
      }

      case 'snoozeSchedule': {
        if (operation.operation === 'set') {
          const snoozeAttributes = getBulkSnooze<Params>(
            updatedRule,
            operation.value as RuleSnoozeSchedule
          );

          try {
            verifySnoozeScheduleLimit(snoozeAttributes.snoozeSchedule);
          } catch (error) {
            throw Error(`Error updating rule: could not add snooze - ${error.message}`);
          }

          updatedRule = {
            ...updatedRule,
            muteAll: snoozeAttributes.muteAll,
            snoozeSchedule: snoozeAttributes.snoozeSchedule as RuleDomain['snoozeSchedule'],
          };
        }

        if (operation.operation === 'delete') {
          const idsToDelete = operation.value && [...operation.value];
          if (idsToDelete?.length === 0) {
            updatedRule.snoozeSchedule?.forEach((schedule) => {
              if (schedule.id) {
                idsToDelete.push(schedule.id);
              }
            });
          }
          const snoozeAttributes = getBulkUnsnooze(updatedRule, idsToDelete);
          updatedRule = {
            ...updatedRule,
            muteAll: snoozeAttributes.muteAll,
            snoozeSchedule: snoozeAttributes.snoozeSchedule as RuleDomain['snoozeSchedule'],
          };
        }

        isAttributesUpdateSkipped = false;
        break;
      }

      case 'apiKey': {
        hasUpdateApiKeyOperation = true;
        isAttributesUpdateSkipped = false;
        break;
      }

      default: {
        if (operation.field === 'schedule') {
          const defaultActions = updatedRule.actions.filter(
            (action) => !actionsClient.isSystemAction(action.id)
          );
          validateScheduleOperation(operation.value, defaultActions, rule.id);
        }

        const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
          operation,
          updatedRule
        );

        if (isAttributeModified) {
          updatedRule = {
            ...updatedRule,
            ...modifiedAttributes,
          };
          isAttributesUpdateSkipped = false;
        }
      }
    }
    // Only increment revision if update wasn't skipped and `operation.field` should result in a revision increment
    if (
      !isAttributesUpdateSkipped &&
      !bulkEditFieldsToExcludeFromRevisionUpdates.has(operation.field) &&
      rule.revision - updatedRule.revision === 0
    ) {
      updatedRule.revision += 1;
    }
  }
  return {
    rule: updatedRule,
    ruleActions: updatedRuleActions,
    hasUpdateApiKeyOperation,
    isAttributesUpdateSkipped,
  };
}

function validateScheduleInterval(
  context: RulesClientContext,
  scheduleInterval: string,
  ruleTypeId: string,
  ruleId: string
): void {
  if (!scheduleInterval) {
    return;
  }
  const isIntervalInvalid = parseDuration(scheduleInterval) < context.minimumScheduleIntervalInMs;
  if (isIntervalInvalid && context.minimumScheduleInterval.enforce) {
    throw Error(
      `Error updating rule: the interval is less than the allowed minimum interval of ${context.minimumScheduleInterval.value}`
    );
  } else if (isIntervalInvalid && !context.minimumScheduleInterval.enforce) {
    context.logger.warn(
      `Rule schedule interval (${scheduleInterval}) for "${ruleTypeId}" rule type with ID "${ruleId}" is less than the minimum value (${context.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent such changes.`
    );
  }
}

/**
 * Validate that updated schedule interval is not longer than any of the existing action frequencies
 * @param schedule Schedule interval that user tries to set
 * @param actions Rule actions
 */
function validateScheduleOperation(
  schedule: RuleDomain['schedule'],
  actions: RuleDomain['actions'],
  ruleId: string
): void {
  const scheduleInterval = parseDuration(schedule.interval);
  const actionsWithInvalidThrottles = [];

  for (const action of actions) {
    // check for actions throttled shorter than the rule schedule
    if (
      action.frequency?.notifyWhen === ruleNotifyWhen.THROTTLE &&
      parseDuration(action.frequency.throttle!) < scheduleInterval
    ) {
      actionsWithInvalidThrottles.push(action);
    }
  }

  if (actionsWithInvalidThrottles.length > 0) {
    throw Error(
      `Error updating rule with ID "${ruleId}": the interval ${schedule.interval} is longer than the action frequencies`
    );
  }
}

async function prepareApiKeys(
  context: RulesClientContext,
  rule: SavedObjectsFindResult<RawRule>,
  ruleType: RuleType,
  apiKeysMap: ApiKeysMap,
  attributes: RawRule,
  hasUpdateApiKeyOperation: boolean,
  username: string | null
): Promise<{ apiKeyAttributes: ApiKeyAttributes }> {
  const apiKeyAttributes = await createNewAPIKeySet(context, {
    id: ruleType.id,
    ruleName: attributes.name,
    username,
    shouldUpdateApiKey: attributes.enabled || hasUpdateApiKeyOperation,
    errorMessage: 'Error updating rule: could not create API key',
  });

  // collect generated API keys
  if (apiKeyAttributes.apiKey) {
    apiKeysMap.set(rule.id, {
      ...apiKeysMap.get(rule.id),
      newApiKey: apiKeyAttributes.apiKey,
      newApiKeyCreatedByUser: apiKeyAttributes.apiKeyCreatedByUser,
    });
  }

  return {
    apiKeyAttributes,
  };
}

function updateAttributes(
  context: RulesClientContext,
  attributes: RawRule,
  apiKeyAttributes: ApiKeyAttributes,
  updatedParams: RuleParams,
  rawAlertActions: RawRuleAction[],
  username: string | null
): {
  updatedAttributes: RawRule;
} {
  // get notifyWhen
  const notifyWhen = getRuleNotifyWhenType(
    attributes.notifyWhen ?? null,
    attributes.throttle ?? null
  );

  // TODO (http-versioning) Remove casts when updateMeta has been converted
  const castedAttributes = attributes;
  const updatedAttributes = updateMeta(context, {
    ...castedAttributes,
    ...apiKeyAttributes,
    params: updatedParams,
    actions: rawAlertActions,
    notifyWhen,
    updatedBy: username,
    updatedAt: new Date().toISOString(),
  });

  // add mapped_params
  const mappedParams = getMappedParams(updatedParams);

  if (Object.keys(mappedParams).length) {
    updatedAttributes.mapped_params = mappedParams;
  }

  return {
    updatedAttributes,
  };
}

async function saveBulkUpdatedRules({
  context,
  rules,
  apiKeysMap,
}: {
  context: RulesClientContext;
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  apiKeysMap: ApiKeysMap;
}) {
  const apiKeysToInvalidate: string[] = [];
  let result;
  try {
    // TODO (http-versioning): for whatever reasoning we are using SavedObjectsBulkUpdateObject
    // everywhere when it should be SavedObjectsBulkCreateObject. We need to fix it in
    // bulk_disable, bulk_enable, etc. to fix this cast
    result = await bulkCreateRulesSo({
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      bulkCreateRuleAttributes: rules as Array<SavedObjectsBulkCreateObject<RawRule>>,
      savedObjectsBulkCreateOptions: { overwrite: true },
    });
  } catch (e) {
    // avoid unused newly generated API keys
    if (apiKeysMap.size > 0) {
      await bulkMarkApiKeysForInvalidation(
        {
          apiKeys: Array.from(apiKeysMap.values())
            .filter((value) => value.newApiKey && !value.newApiKeyCreatedByUser)
            .map((value) => value.newApiKey as string),
        },
        context.logger,
        context.unsecuredSavedObjectsClient
      );
    }
    throw e;
  }

  result.saved_objects.map(({ id, error }) => {
    const oldApiKey = apiKeysMap.get(id)?.oldApiKey;
    const oldApiKeyCreatedByUser = apiKeysMap.get(id)?.oldApiKeyCreatedByUser;
    const newApiKey = apiKeysMap.get(id)?.newApiKey;
    const newApiKeyCreatedByUser = apiKeysMap.get(id)?.newApiKeyCreatedByUser;

    // if SO wasn't saved and has new API key it will be invalidated
    if (error && newApiKey && !newApiKeyCreatedByUser) {
      apiKeysToInvalidate.push(newApiKey);
      // if SO saved and has old Api Key it will be invalidate
    } else if (!error && oldApiKey && !oldApiKeyCreatedByUser) {
      apiKeysToInvalidate.push(oldApiKey);
    }
  });

  return { result, apiKeysToInvalidate };
}

async function attemptToMigrateLegacyFrequency<Params extends RuleParams>(
  context: RulesClientContext,
  operationField: BulkEditOperation['field'],
  actions: NormalizedAlertAction[],
  rule: RuleDomain<Params>,
  ruleType: RuleType
) {
  if (operationField !== 'actions')
    throw new Error('Can only perform frequency migration on an action operation');
  // Try to remove the rule-level frequency params, and then validate actions
  if (typeof rule.notifyWhen !== 'undefined') rule.notifyWhen = undefined;
  if (rule.throttle) rule.throttle = undefined;
  await validateActions(context, ruleType, {
    ...rule,
    actions,
  });
  return rule;
}
