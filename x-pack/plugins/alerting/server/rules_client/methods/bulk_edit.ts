/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import Boom from '@hapi/boom';
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
} from '../../types';
import { convertRuleIdsToKueryNode } from '../../lib';
import { WriteOperations, AlertingAuthorizationEntity } from '../../authorization';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import {
  retryIfBulkEditConflicts,
  applyBulkEditOperation,
  buildKueryNodeFilter,
  getBulkSnoozeAttributes,
  getBulkUnsnoozeAttributes,
} from '../common';
import {
  alertingAuthorizationFilterOpts,
  MAX_RULES_NUMBER_FOR_BULK_OPERATION,
  RULE_TYPE_CHECKS_CONCURRENCY,
  API_KEY_GENERATE_CONCURRENCY,
} from '../common/constants';
import { getAlertFromRaw, rulesUpdateFlow, RulesUpdateFlowSteps } from '../lib';
import {
  NormalizedAlertAction,
  BulkOperationError,
  RuleBulkOperationAggregation,
  RulesClientContext,
} from '../types';

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
  const rulesUpdateFlowSteps = rulesUpdateFlow(context);

  for await (const response of rulesFinder.find()) {
    await pMap(
      response.saved_objects,
      async (rule: SavedObjectsFindResult<RawRule>) =>
        updateRuleAttributesAndParamsInMemory({
          context,
          rule,
          operations,
          paramsModifier,
          rules,
          skipped,
          errors,
          rulesUpdateFlowSteps,
          shouldIncrementRevision,
        }),
      { concurrency: API_KEY_GENERATE_CONCURRENCY }
    );
  }
  await rulesFinder.close();

  const { result, apiKeysToInvalidate } =
    rules.length > 0
      ? await saveBulkUpdatedRules({
          context,
          rules,
          apiKeysMap: rulesUpdateFlowSteps.getApiKeysMap(),
          cleanup: rulesUpdateFlowSteps.cleanup,
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
  rules,
  skipped,
  errors,
  rulesUpdateFlowSteps,
  shouldIncrementRevision = () => true,
}: {
  context: RulesClientContext;
  rule: SavedObjectsFindResult<RawRule>;
  operations: BulkEditOptions<Params>['operations'];
  paramsModifier: BulkEditOptions<Params>['paramsModifier'];
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  skipped: BulkActionSkipResult[];
  errors: BulkOperationError[];
  rulesUpdateFlowSteps: RulesUpdateFlowSteps;
  shouldIncrementRevision: BulkEditOptions<Params>['shouldIncrementRevision'];
}): Promise<void> {
  try {
    const {
      prepareRuleForUpdate,
      updateActions,
      updateParams,
      extractReferencesFromParamsAndActions,
      createAPIKey,
      updateAttributes,
      maybeIncrementRevision,
      validateAttributes,
      getUpdatedAttributeAndRefsForSaving,
      getRuleFieldsWithRefs,
    } = rulesUpdateFlowSteps;

    await prepareRuleForUpdate(rule);

    if (rule.attributes.actions.length) {
      await context.actionsAuthorization.ensureAuthorized('execute');
    }

    let hasUpdateApiKeyOperation = false;
    let isAttributesUpdateSkipped = true;

    for (const operation of operations) {
      // Check if the update should be skipped for the current action.
      // If it should, save the skip reasons in attributesUpdateSkipReasons
      // and continue to the next operation before without
      // the `isAttributesUpdateSkipped` flag to false.
      switch (operation.field) {
        case 'actions': {
          const { actions: actionsWithRefs } = getRuleFieldsWithRefs(rule.id);
          const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(operation, {
            actions: actionsWithRefs,
          });
          if (isAttributeModified) {
            await updateActions(rule.id, { actions: modifiedAttributes.actions });
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
            await updateAttributes(rule.id, { ...snoozeAttributes });
          }
          if (operation.operation === 'delete') {
            const idsToDelete = operation.value && [...operation.value];
            if (idsToDelete?.length === 0) {
              rule.attributes.snoozeSchedule?.forEach((schedule) => {
                if (schedule.id) {
                  idsToDelete.push(schedule.id);
                }
              });
            }
            const snoozeAttributes = getBulkUnsnoozeAttributes(rule.attributes, idsToDelete);
            await updateAttributes(rule.id, { ...snoozeAttributes });
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
          const { modifiedAttributes, isAttributeModified } = applyBulkEditOperation(
            operation,
            rule.attributes
          );
          if (isAttributeModified) {
            await updateAttributes(rule.id, { ...modifiedAttributes });
            isAttributesUpdateSkipped = false;
          }
        }
      }
    }

    const { params: paramsWithRefs } = getRuleFieldsWithRefs(rule.id);
    const { modifiedParams: ruleParams, isParamsUpdateSkipped } = paramsModifier
      ? await paramsModifier(paramsWithRefs as Params)
      : {
          modifiedParams: paramsWithRefs,
          isParamsUpdateSkipped: true,
        };

    await updateParams(rule.id, { params: ruleParams });

    await extractReferencesFromParamsAndActions(rule.id);

    await createAPIKey(rule.id, { forceUpdate: hasUpdateApiKeyOperation });

    await validateAttributes(rule.id);

    // If neither attributes nor parameters were updated, mark
    // the rule as skipped and continue to the next rule.
    if (isAttributesUpdateSkipped && isParamsUpdateSkipped) {
      skipped.push({
        id: rule.id,
        name: rule.attributes.name,
        skip_reason: 'RULE_NOT_MODIFIED',
      });
      return;
    } else {
      await maybeIncrementRevision(rule.id, { shouldIncrementRevision });
    }

    const { attributes: updatedAttributes, references } = await getUpdatedAttributeAndRefsForSaving(
      rule.id
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

async function saveBulkUpdatedRules({
  context,
  rules,
  apiKeysMap,
  cleanup,
}: {
  context: RulesClientContext;
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  apiKeysMap: ApiKeysMap;
  cleanup: () => Promise<void>;
}) {
  const apiKeysToInvalidate: string[] = [];
  let result;
  try {
    result = await context.unsecuredSavedObjectsClient.bulkCreate(rules, { overwrite: true });
  } catch (e) {
    await cleanup();
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
