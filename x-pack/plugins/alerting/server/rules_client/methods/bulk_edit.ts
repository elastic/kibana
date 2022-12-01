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
import { SavedObjectsBulkUpdateObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import { RawRule, SanitizedRule, RuleTypeParams, Rule, RuleSnoozeSchedule } from '../../types';
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
  generateAPIKeyName,
  apiKeyAsAlertAttributes,
  getBulkSnoozeAttributes,
  getBulkUnsnoozeAttributes,
  verifySnoozeScheduleLimit,
} from '../common';
import {
  alertingAuthorizationFilterOpts,
  MAX_RULES_NUMBER_FOR_BULK_OPERATION,
  RULE_TYPE_CHECKS_CONCURRENCY,
  API_KEY_GENERATE_CONCURRENCY,
} from '../common/constants';
import { getMappedParams } from '../common/mapped_params_utils';
import { getAlertFromRaw, extractReferences, validateActions, updateMeta } from '../lib';
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

type RuleParamsModifier<Params extends RuleTypeParams> = (params: Params) => Promise<Params>;

export interface BulkEditOptionsFilter<Params extends RuleTypeParams> {
  filter?: string | KueryNode;
  operations: BulkEditOperation[];
  paramsModifier?: RuleParamsModifier<Params>;
}

export interface BulkEditOptionsIds<Params extends RuleTypeParams> {
  ids: string[];
  operations: BulkEditOperation[];
  paramsModifier?: RuleParamsModifier<Params>;
}

export type BulkEditOptions<Params extends RuleTypeParams> =
  | BulkEditOptionsFilter<Params>
  | BulkEditOptionsIds<Params>;

export async function bulkEdit<Params extends RuleTypeParams>(
  context: RulesClientContext,
  options: BulkEditOptions<Params>
): Promise<{
  rules: Array<SanitizedRule<Params>>;
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

  const { apiKeysToInvalidate, results, errors } = await retryIfBulkEditConflicts(
    context.logger,
    `rulesClient.update('operations=${JSON.stringify(options.operations)}, paramsModifier=${
      options.paramsModifier ? '[Function]' : undefined
    }')`,
    (filterKueryNode: KueryNode | null) =>
      bulkEditOcc(context, {
        filter: filterKueryNode,
        operations: options.operations,
        paramsModifier: options.paramsModifier,
      }),
    qNodeFilterWithAuth
  );

  await bulkMarkApiKeysForInvalidation(
    { apiKeys: apiKeysToInvalidate },
    context.logger,
    context.unsecuredSavedObjectsClient
  );

  const updatedRules = results.map(({ id, attributes, references }) => {
    return getAlertFromRaw<Params>(
      context,
      id,
      attributes.alertTypeId as string,
      attributes as RawRule,
      references,
      false
    );
  });

  // update schedules only if schedule operation is present
  const scheduleOperation = options.operations.find(
    (
      operation
    ): operation is Extract<BulkEditOperation, { field: Extract<BulkEditFields, 'schedule'> }> =>
      operation.field === 'schedule'
  );

  if (scheduleOperation?.value) {
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

  return { rules: updatedRules, errors, total };
}

async function bulkEditOcc<Params extends RuleTypeParams>(
  context: RulesClientContext,
  {
    filter,
    operations,
    paramsModifier,
  }: {
    filter: KueryNode | null;
    operations: BulkEditOptions<Params>['operations'];
    paramsModifier: BulkEditOptions<Params>['paramsModifier'];
  }
): Promise<{
  apiKeysToInvalidate: string[];
  rules: Array<SavedObjectsBulkUpdateObject<RawRule>>;
  resultSavedObjects: Array<SavedObjectsUpdateResponse<RawRule>>;
  errors: BulkOperationError[];
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
  const errors: BulkOperationError[] = [];
  const apiKeysToInvalidate: string[] = [];
  const apiKeysMap = new Map<string, { oldApiKey?: string; newApiKey?: string }>();
  const username = await context.getUserName();

  for await (const response of rulesFinder.find()) {
    await pMap(
      response.saved_objects,
      async (rule) => {
        try {
          if (rule.attributes.apiKey) {
            apiKeysMap.set(rule.id, { oldApiKey: rule.attributes.apiKey });
          }

          const ruleType = context.ruleTypeRegistry.get(rule.attributes.alertTypeId);

          let attributes = cloneDeep(rule.attributes);
          let ruleActions = {
            actions: injectReferencesIntoActions(
              rule.id,
              rule.attributes.actions,
              rule.references || []
            ),
          };

          for (const operation of operations) {
            const { field } = operation;
            if (field === 'snoozeSchedule' || field === 'apiKey') {
              if (rule.attributes.actions.length) {
                try {
                  await context.actionsAuthorization.ensureAuthorized('execute');
                } catch (error) {
                  throw Error(`Rule not authorized for bulk ${field} update - ${error.message}`);
                }
              }
            }
          }

          let hasUpdateApiKeyOperation = false;

          for (const operation of operations) {
            switch (operation.field) {
              case 'actions':
                await validateActions(context, ruleType, {
                  ...attributes,
                  actions: operation.value,
                });
                ruleActions = applyBulkEditOperation(operation, ruleActions);
                break;
              case 'snoozeSchedule':
                // Silently skip adding snooze or snooze schedules on security
                // rules until we implement snoozing of their rules
                if (attributes.consumer === AlertConsumers.SIEM) {
                  break;
                }
                if (operation.operation === 'set') {
                  const snoozeAttributes = getBulkSnoozeAttributes(attributes, operation.value);
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
                break;
              case 'apiKey': {
                hasUpdateApiKeyOperation = true;
                break;
              }
              default:
                attributes = applyBulkEditOperation(operation, attributes);
            }
          }

          // validate schedule interval
          if (attributes.schedule.interval) {
            const isIntervalInvalid =
              parseDuration(attributes.schedule.interval as string) <
              context.minimumScheduleIntervalInMs;
            if (isIntervalInvalid && context.minimumScheduleInterval.enforce) {
              throw Error(
                `Error updating rule: the interval is less than the allowed minimum interval of ${context.minimumScheduleInterval.value}`
              );
            } else if (isIntervalInvalid && !context.minimumScheduleInterval.enforce) {
              context.logger.warn(
                `Rule schedule interval (${attributes.schedule.interval}) for "${ruleType.id}" rule type with ID "${attributes.id}" is less than the minimum value (${context.minimumScheduleInterval.value}). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent such changes.`
              );
            }
          }

          const ruleParams = paramsModifier
            ? await paramsModifier(attributes.params as Params)
            : attributes.params;

          // validate rule params
          const validatedAlertTypeParams = validateRuleTypeParams(
            ruleParams,
            ruleType.validate?.params
          );
          const validatedMutatedAlertTypeParams = validateMutatedRuleTypeParams(
            validatedAlertTypeParams,
            rule.attributes.params,
            ruleType.validate?.params
          );

          const {
            actions: rawAlertActions,
            references,
            params: updatedParams,
          } = await extractReferences(
            context,
            ruleType,
            ruleActions.actions,
            validatedMutatedAlertTypeParams
          );

          const shouldUpdateApiKey = attributes.enabled || hasUpdateApiKeyOperation;

          // create API key
          let createdAPIKey = null;
          try {
            createdAPIKey = shouldUpdateApiKey
              ? await context.createAPIKey(generateAPIKeyName(ruleType.id, attributes.name))
              : null;
          } catch (error) {
            throw Error(`Error updating rule: could not create API key - ${error.message}`);
          }

          const apiKeyAttributes = apiKeyAsAlertAttributes(createdAPIKey, username);

          // collect generated API keys
          if (apiKeyAttributes.apiKey) {
            apiKeysMap.set(rule.id, {
              ...apiKeysMap.get(rule.id),
              newApiKey: apiKeyAttributes.apiKey,
            });
          }

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
      },
      { concurrency: API_KEY_GENERATE_CONCURRENCY }
    );
  }

  let result;
  try {
    result = await context.unsecuredSavedObjectsClient.bulkCreate(rules, { overwrite: true });
  } catch (e) {
    // avoid unused newly generated API keys
    if (apiKeysMap.size > 0) {
      await bulkMarkApiKeysForInvalidation(
        {
          apiKeys: Array.from(apiKeysMap.values()).reduce<string[]>((acc, value) => {
            if (value.newApiKey) {
              acc.push(value.newApiKey);
            }
            return acc;
          }, []),
        },
        context.logger,
        context.unsecuredSavedObjectsClient
      );
    }
    throw e;
  }

  result.saved_objects.map(({ id, error }) => {
    const oldApiKey = apiKeysMap.get(id)?.oldApiKey;
    const newApiKey = apiKeysMap.get(id)?.newApiKey;

    // if SO wasn't saved and has new API key it will be invalidated
    if (error && newApiKey) {
      apiKeysToInvalidate.push(newApiKey);
      // if SO saved and has old Api Key it will be invalidate
    } else if (!error && oldApiKey) {
      apiKeysToInvalidate.push(oldApiKey);
    }
  });

  return { apiKeysToInvalidate, resultSavedObjects: result.saved_objects, errors, rules };
}
