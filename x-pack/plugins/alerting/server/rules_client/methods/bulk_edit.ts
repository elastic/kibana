/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import Boom from '@hapi/boom';
import { cloneDeep } from 'lodash';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { KueryNode, nodeBuilder } from '@kbn/es-query';
import {
  SavedObjectsBulkUpdateObject,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { BulkActionSkipResult } from '../../../common/bulk_edit';
import {
  RawRule,
  SanitizedRule,
  RuleTypeParams,
  Rule,
  RuleSnoozeSchedule,
  RuleWithLegacyId,
  RuleTypeRegistry,
  RawRuleAction,
  RuleNotifyWhen,
} from '../../types';
import {
  validateRuleTypeParams,
  getRuleNotifyWhenType,
  validateMutatedRuleTypeParams,
  convertRuleIdsToKueryNode,
} from '../../lib';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { parseDuration } from '../../../common/parse_duration';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import {
  retryIfBulkEditConflicts,
  applyBulkEditOperation,
  buildKueryNodeFilter,
  injectReferencesIntoActions,
  getBulkSnoozeAttributes,
  getBulkUnsnoozeAttributes,
  verifySnoozeScheduleLimit,
  injectReferencesIntoParams,
} from '../common';
import {
  alertingAuthorizationFilterOpts,
  MAX_RULES_NUMBER_FOR_BULK_OPERATION,
  RULE_TYPE_CHECKS_CONCURRENCY,
  API_KEY_GENERATE_CONCURRENCY,
} from '../common/constants';
import { getMappedParams } from '../common/mapped_params_utils';
import {
  getAlertFromRaw,
  extractReferences,
  validateActions,
  updateMeta,
  addGeneratedActionValues,
  createNewAPIKeySet,
} from '../lib';
import {
  NormalizedAlertAction,
  BulkOperationError,
  RuleBulkOperationAggregation,
  RulesClientContext,
  NormalizedAlertActionWithGeneratedValues,
} from '../types';

import { migrateLegacyActions } from '../lib';

export type BulkEditFields = keyof Pick<
  Rule,
  'actions' | 'tags' | 'schedule' | 'throttle' | 'notifyWhen' | 'snoozeSchedule' | 'apiKey'
>;

export const bulkEditFieldsToExcludeFromRevisionUpdates: ReadonlySet<BulkEditOperation['field']> =
  new Set(['snoozeSchedule', 'apiKey']);

export type BulkEditOperation =
  | {
      operation: 'add' | 'delete' | 'set';
      field: Extract<BulkEditFields, 'tags'>;
      value: string[];
    }
  | {
      operation: 'add' | 'set';
      field: Extract<BulkEditFields, 'actions'>;
      value: NormalizedAlertAction[];
    }
  | {
      operation: 'set';
      field: Extract<BulkEditFields, 'schedule'>;
      value: Rule['schedule'];
    }
  | {
      operation: 'set';
      field: Extract<BulkEditFields, 'throttle'>;
      value: Rule['throttle'];
    }
  | {
      operation: 'set';
      field: Extract<BulkEditFields, 'notifyWhen'>;
      value: Rule['notifyWhen'];
    }
  | {
      operation: 'set';
      field: Extract<BulkEditFields, 'snoozeSchedule'>;
      value: RuleSnoozeSchedule;
    }
  | {
      operation: 'delete';
      field: Extract<BulkEditFields, 'snoozeSchedule'>;
      value?: string[];
    }
  | {
      operation: 'set';
      field: Extract<BulkEditFields, 'apiKey'>;
      value?: undefined;
    };

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

export interface RuleParamsModifierResult<Params> {
  modifiedParams: Params;
  isParamsUpdateSkipped: boolean;
}

export type RuleParamsModifier<Params extends RuleTypeParams> = (
  params: Params
) => Promise<RuleParamsModifierResult<Params>>;

export type ShouldIncrementRevision<Params extends RuleTypeParams> = (
  params?: RuleTypeParams
) => boolean;

export interface BulkEditOptionsFilter<Params extends RuleTypeParams> {
  filter?: string | KueryNode;
  operations: BulkEditOperation[];
  paramsModifier?: RuleParamsModifier<Params>;
  shouldIncrementRevision?: ShouldIncrementRevision<Params>;
}

export interface BulkEditOptionsIds<Params extends RuleTypeParams> {
  ids: string[];
  operations: BulkEditOperation[];
  paramsModifier?: RuleParamsModifier<Params>;
  shouldIncrementRevision?: ShouldIncrementRevision<Params>;
}

export type BulkEditOptions<Params extends RuleTypeParams> =
  | BulkEditOptionsFilter<Params>
  | BulkEditOptionsIds<Params>;

export async function bulkEdit<Params extends RuleTypeParams>(
  context: RulesClientContext,
  options: BulkEditOptions<Params>
): Promise<{
  rules: Array<SanitizedRule<Params>>;
  skipped: BulkActionSkipResult[];
  errors: BulkOperationError[];
  total: number;
}> {
  const queryFilter = (options as BulkEditOptionsFilter<Params>).filter;
  const ids = (options as BulkEditOptionsIds<Params>).ids;

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

  const { aggregations, total } = await context.unsecuredSavedObjectsClient.find<
    RawRule,
    RuleBulkOperationAggregation
  >({
    filter: qNodeFilterWithAuth,
    page: 1,
    perPage: 0,
    type: 'alert',
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
      bulkEditOcc(context, {
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
    return getAlertFromRaw<Params>(
      context,
      id,
      attributes.alertTypeId as string,
      attributes as RawRule,
      references,
      false,
      false,
      false,
      false
    );
  });

  await bulkUpdateSchedules(context, options.operations, updatedRules);

  return { rules: updatedRules, skipped, errors, total };
}

async function bulkEditOcc<Params extends RuleTypeParams>(
  context: RulesClientContext,
  {
    filter,
    operations,
    paramsModifier,
    shouldIncrementRevision,
  }: {
    filter: KueryNode | null;
    operations: BulkEditOptions<Params>['operations'];
    paramsModifier: BulkEditOptions<Params>['paramsModifier'];
    shouldIncrementRevision?: BulkEditOptions<Params>['shouldIncrementRevision'];
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
        type: 'alert',
        perPage: 100,
        ...(context.namespace ? { namespaces: [context.namespace] } : undefined),
      }
    );

  const rules: Array<SavedObjectsBulkUpdateObject<RawRule>> = [];
  const skipped: BulkActionSkipResult[] = [];
  const errors: BulkOperationError[] = [];
  const apiKeysMap: ApiKeysMap = new Map();
  const username = await context.getUserName();

  for await (const response of rulesFinder.find()) {
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

  const { result, apiKeysToInvalidate } =
    rules.length > 0
      ? await saveBulkUpdatedRules(context, rules, apiKeysMap)
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

async function bulkUpdateSchedules(
  context: RulesClientContext,
  operations: BulkEditOperation[],
  updatedRules: Array<Rule | RuleWithLegacyId>
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

async function updateRuleAttributesAndParamsInMemory<Params extends RuleTypeParams>({
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
  operations: BulkEditOptions<Params>['operations'];
  paramsModifier: BulkEditOptions<Params>['paramsModifier'];
  apiKeysMap: ApiKeysMap;
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  skipped: BulkActionSkipResult[];
  errors: BulkOperationError[];
  username: string | null;
  shouldIncrementRevision: BulkEditOptions<Params>['shouldIncrementRevision'];
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
    const migratedActions = await migrateLegacyActions(context, {
      ruleId: rule.id,
      actions: rule.attributes.actions,
      references: rule.references,
      attributes: rule.attributes,
    });

    if (migratedActions.hasLegacyActions) {
      rule.attributes.actions = migratedActions.resultedActions;
      rule.references = migratedActions.resultedReferences;
    }

    const { attributes, ruleActions, hasUpdateApiKeyOperation, isAttributesUpdateSkipped } =
      await getUpdatedAttributesFromOperations(context, operations, rule, ruleType);

    validateScheduleInterval(context, attributes.schedule.interval, ruleType.id, rule.id);

    const params = injectReferencesIntoParams<Params, RuleTypeParams>(
      rule.id,
      ruleType,
      attributes.params,
      rule.references || []
    );
    const { modifiedParams: ruleParams, isParamsUpdateSkipped } = paramsModifier
      ? await paramsModifier(params)
      : {
          modifiedParams: params,
          isParamsUpdateSkipped: true,
        };

    // Increment revision if params ended up being modified AND it wasn't already incremented as part of attribute update
    if (
      shouldIncrementRevision(ruleParams) &&
      !isParamsUpdateSkipped &&
      rule.attributes.revision === attributes.revision
    ) {
      attributes.revision += 1;
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
      actions: rawAlertActions,
      references,
      params: updatedParams,
    } = await extractReferences(
      context,
      ruleType,
      ruleActions.actions as NormalizedAlertActionWithGeneratedValues[],
      validatedMutatedAlertTypeParams
    );

    const { apiKeyAttributes } = await prepareApiKeys(
      context,
      rule,
      ruleType,
      apiKeysMap,
      attributes,
      hasUpdateApiKeyOperation,
      username
    );

    const { updatedAttributes } = updateAttributes(
      context,
      attributes,
      apiKeyAttributes,
      updatedParams,
      rawAlertActions,
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

async function getUpdatedAttributesFromOperations(
  context: RulesClientContext,
  operations: BulkEditOperation[],
  rule: SavedObjectsFindResult<RawRule>,
  ruleType: RuleType
) {
  let attributes = cloneDeep(rule.attributes);
  let ruleActions = {
    actions: injectReferencesIntoActions(
      rule.id,
      rule.attributes.actions || [],
      rule.references || []
    ),
  };

  let hasUpdateApiKeyOperation = false;
  let isAttributesUpdateSkipped = true;

  for (const operation of operations) {
    // Check if the update should be skipped for the current action.
    // If it should, save the skip reasons in attributesUpdateSkipReasons
    // and continue to the next operation before without
    // the `isAttributesUpdateSkipped` flag to false.
    switch (operation.field) {
      case 'actions': {
        const updatedOperation = {
          ...operation,
          value: addGeneratedActionValues(operation.value),
        };

        try {
          await validateActions(context, ruleType, {
            ...attributes,
            actions: updatedOperation.value,
          });
        } catch (e) {
          // If validateActions fails on the first attempt, it may be because of legacy rule-level frequency params
          attributes = await attemptToMigrateLegacyFrequency(
            context,
            updatedOperation,
            attributes,
            ruleType
          );
        }

        const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
          updatedOperation,
          ruleActions
        );
        if (isAttributeModified) {
          ruleActions = modifiedAttributes;
          isAttributesUpdateSkipped = false;
        }

        break;
      }
      case 'snoozeSchedule': {
        // Silently skip adding snooze or snooze schedules on security
        // rules until we implement snoozing of their rules
        if (rule.attributes.consumer === AlertConsumers.SIEM) {
          // While the rule is technically not updated, we are still marking
          // the rule as updated in case of snoozing, until support
          // for snoozing is added.
          isAttributesUpdateSkipped = false;
          break;
        }
        if (operation.operation === 'set') {
          const snoozeAttributes = getBulkSnoozeAttributes(rule.attributes, operation.value);
          try {
            verifySnoozeScheduleLimit(snoozeAttributes);
          } catch (error) {
            throw Error(`Error updating rule: could not add snooze - ${error.message}`);
          }
          attributes = {
            ...attributes,
            ...snoozeAttributes,
          };
        }
        if (operation.operation === 'delete') {
          const idsToDelete = operation.value && [...operation.value];
          if (idsToDelete?.length === 0) {
            attributes.snoozeSchedule?.forEach((schedule) => {
              if (schedule.id) {
                idsToDelete.push(schedule.id);
              }
            });
          }
          attributes = {
            ...attributes,
            ...getBulkUnsnoozeAttributes(attributes, idsToDelete),
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
          validateScheduleOperation(operation.value, attributes.actions, rule.id);
        }
        const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
          operation,
          rule.attributes
        );

        if (isAttributeModified) {
          attributes = {
            ...attributes,
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
      rule.attributes.revision - attributes.revision === 0
    ) {
      attributes.revision += 1;
    }
  }
  return {
    attributes,
    ruleActions,
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
  schedule: RawRule['schedule'],
  actions: RawRule['actions'],
  ruleId: string
): void {
  const scheduleInterval = parseDuration(schedule.interval);
  const actionsWithInvalidThrottles = [];

  for (const action of actions) {
    // check for actions throttled shorter than the rule schedule
    if (
      action.frequency?.notifyWhen === RuleNotifyWhen.THROTTLE &&
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
  updatedParams: RuleTypeParams,
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

  const updatedAttributes = updateMeta(context, {
    ...attributes,
    ...apiKeyAttributes,
    params: updatedParams as RawRule['params'],
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

async function saveBulkUpdatedRules(
  context: RulesClientContext,
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>,
  apiKeysMap: ApiKeysMap
) {
  const apiKeysToInvalidate: string[] = [];
  let result;
  try {
    result = await context.unsecuredSavedObjectsClient.bulkCreate(rules, { overwrite: true });
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

async function attemptToMigrateLegacyFrequency(
  context: RulesClientContext,
  operation: BulkEditOperation,
  attributes: SavedObjectsFindResult<RawRule>['attributes'],
  ruleType: RuleType
) {
  if (operation.field !== 'actions')
    throw new Error('Can only perform frequency migration on an action operation');
  // Try to remove the rule-level frequency params, and then validate actions
  if (typeof attributes.notifyWhen !== 'undefined') attributes.notifyWhen = undefined;
  if (attributes.throttle) attributes.throttle = undefined;
  await validateActions(context, ruleType, {
    ...attributes,
    actions: operation.value,
  });
  return attributes;
}
