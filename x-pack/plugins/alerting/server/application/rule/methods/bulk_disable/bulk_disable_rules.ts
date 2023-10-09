/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { SavedObjectsBulkUpdateObject, SavedObjectsBulkCreateObject } from '@kbn/core/server';
import Boom from '@hapi/boom';
import { withSpan } from '@kbn/apm-utils';
import pMap from 'p-map';
import { Logger } from '@kbn/core/server';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { RawRule, SanitizedRule, RawRuleAction } from '../../../../types';
import { convertRuleIdsToKueryNode } from '../../../../lib';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import {
  retryIfBulkOperationConflicts,
  buildKueryNodeFilter,
  tryToRemoveTasks,
} from '../../../../rules_client/common';
import {
  getAuthorizationFilter,
  checkAuthorizationAndGetTotal,
  untrackRuleAlerts,
  updateMeta,
  migrateLegacyActions,
} from '../../../../rules_client/lib';
import { transformRuleAttributesToRuleDomain, transformRuleDomainToRule } from '../../transforms';
import type {
  BulkOperationError,
  BulkDisableRulesResult,
  BulkDisableRulesRequestBody,
} from './types';
import type { RuleAttributes } from '../../../../data/rule/types';
import { validateBulkDisableRulesBody } from './validation';
import { ruleDomainSchema } from '../../schemas';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { RuleParams, RuleDomain } from '../../types';
import { bulkDisableRulesSo } from '../../../../data/rule';

export const bulkDisableRules = async <Params extends RuleParams>(
  context: RulesClientContext,
  options: BulkDisableRulesRequestBody
): Promise<BulkDisableRulesResult<Params>> => {
  try {
    validateBulkDisableRulesBody(options);
  } catch (error) {
    throw Boom.badRequest(`Error validating bulk disable data - ${error.message}`);
  }

  const { ids, filter } = options;

  const kueryNodeFilter = ids ? convertRuleIdsToKueryNode(ids) : buildKueryNodeFilter(filter);
  const authorizationFilter = await getAuthorizationFilter(context, { action: 'DISABLE' });

  const kueryNodeFilterWithAuth =
    authorizationFilter && kueryNodeFilter
      ? nodeBuilder.and([kueryNodeFilter, authorizationFilter as KueryNode])
      : kueryNodeFilter;

  const { total } = await checkAuthorizationAndGetTotal(context, {
    filter: kueryNodeFilterWithAuth,
    action: 'DISABLE',
  });

  const { errors, rules, accListSpecificForBulkOperation } = await withSpan(
    { name: 'retryIfBulkOperationConflicts', type: 'rules' },
    () =>
      retryIfBulkOperationConflicts({
        action: 'DISABLE',
        logger: context.logger,
        bulkOperation: (filterKueryNode: KueryNode | null) =>
          bulkDisableRulesWithOCC(context, { filter: filterKueryNode }),
        filter: kueryNodeFilterWithAuth,
      })
  );

  const [taskIdsToDisable, taskIdsToDelete, taskIdsToClearState] = accListSpecificForBulkOperation;

  await Promise.allSettled([
    tryToDisableTasks({
      taskIdsToDisable,
      taskIdsToClearState,
      logger: context.logger,
      taskManager: context.taskManager,
    }),
    tryToRemoveTasks({ taskIdsToDelete, logger: context.logger, taskManager: context.taskManager }),
  ]);

  const disabledRules = rules.map(({ id, attributes, references }) => {
    // TODO (http-versioning): alertTypeId should never be null, but we need to
    // fix the type cast from SavedObjectsBulkUpdateObject to SavedObjectsBulkUpdateObject
    // when we are doing the bulk disable and this should fix itself
    const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId!);
    const ruleDomain = transformRuleAttributesToRuleDomain<Params>(attributes as RuleAttributes, {
      id,
      logger: context.logger,
      ruleType,
      references,
      omitGeneratedValues: false,
    });

    try {
      ruleDomainSchema.validate(ruleDomain);
    } catch (e) {
      context.logger.warn(`Error validating bulk disabled rule domain object for id: ${id}, ${e}`);
    }
    return ruleDomain;
  });

  // TODO (http-versioning): This should be of type Rule, change this when all rule types are fixed
  const disabledPublicRules = disabledRules.map((rule: RuleDomain<Params>) => {
    return transformRuleDomainToRule<Params>(rule);
  }) as Array<SanitizedRule<Params>>;

  return { errors, rules: disabledPublicRules, total };
};

const bulkDisableRulesWithOCC = async (
  context: RulesClientContext,
  { filter }: { filter: KueryNode | null }
) => {
  const additionalFilter = nodeBuilder.is('alert.attributes.enabled', 'true');

  const rulesFinder = await withSpan(
    {
      name: 'encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser',
      type: 'rules',
    },
    () =>
      context.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RuleAttributes>(
        {
          filter: filter ? nodeBuilder.and([filter, additionalFilter]) : additionalFilter,
          type: 'alert',
          perPage: 100,
          ...(context.namespace ? { namespaces: [context.namespace] } : undefined),
        }
      )
  );

  const rulesToDisable: Array<SavedObjectsBulkUpdateObject<RuleAttributes>> = [];
  const errors: BulkOperationError[] = [];
  const ruleNameToRuleIdMapping: Record<string, string> = {};
  const username = await context.getUserName();

  await withSpan(
    { name: 'Get rules, collect them and their attributes', type: 'rules' },
    async () => {
      for await (const response of rulesFinder.find()) {
        await pMap(response.saved_objects, async (rule) => {
          try {
            await untrackRuleAlerts(context, rule.id, rule.attributes);

            if (rule.attributes.name) {
              ruleNameToRuleIdMapping[rule.id] = rule.attributes.name;
            }

            // migrate legacy actions only for SIEM rules
            // TODO (http-versioning) Remove RawRuleAction and RawRule casts
            const migratedActions = await migrateLegacyActions(context, {
              ruleId: rule.id,
              actions: rule.attributes.actions as RawRuleAction[],
              references: rule.references,
              attributes: rule.attributes as RawRule,
            });

            // TODO (http-versioning) Remove casts when updateMeta has been converted
            const castedAttributes = rule.attributes as RawRule;
            const updatedAttributes = updateMeta(context, {
              ...castedAttributes,
              ...(migratedActions.hasLegacyActions
                ? {
                    actions: migratedActions.resultedActions,
                    throttle: undefined,
                    notifyWhen: undefined,
                  }
                : {}),
              enabled: false,
              scheduledTaskId:
                rule.attributes.scheduledTaskId === rule.id
                  ? rule.attributes.scheduledTaskId
                  : null,
              updatedBy: username,
              updatedAt: new Date().toISOString(),
            });

            rulesToDisable.push({
              ...rule,
              // TODO (http-versioning) Remove casts when updateMeta has been converted
              attributes: {
                ...updatedAttributes,
              } as RuleAttributes,
              ...(migratedActions.hasLegacyActions
                ? { references: migratedActions.resultedReferences }
                : {}),
            });

            context.auditLogger?.log(
              ruleAuditEvent({
                action: RuleAuditAction.DISABLE,
                outcome: 'unknown',
                savedObject: { type: 'alert', id: rule.id },
              })
            );
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
                action: RuleAuditAction.DISABLE,
                error,
              })
            );
          }
        });
      }
      await rulesFinder.close();
    }
  );

  // TODO (http-versioning): for whatever reasoning we are using SavedObjectsBulkUpdateObject
  // everywhere when it should be SavedObjectsBulkCreateObject. We need to fix it in
  // bulk_disable, bulk_enable, etc. to fix this cast

  const result = await withSpan(
    { name: 'unsecuredSavedObjectsClient.bulkCreate', type: 'rules' },
    () =>
      bulkDisableRulesSo({
        savedObjectsClient: context.unsecuredSavedObjectsClient,
        bulkDisableRuleAttributes: rulesToDisable as Array<
          SavedObjectsBulkCreateObject<RuleAttributes>
        >,
        savedObjectsBulkCreateOptions: { overwrite: true },
      })
  );

  const taskIdsToDisable: string[] = [];
  const taskIdsToDelete: string[] = [];
  const taskIdsToClearState: string[] = [];
  const disabledRules: Array<SavedObjectsBulkUpdateObject<RuleAttributes>> = [];

  result.saved_objects.forEach((rule) => {
    if (rule.error === undefined) {
      if (rule.attributes.scheduledTaskId) {
        if (rule.attributes.scheduledTaskId !== rule.id) {
          taskIdsToDelete.push(rule.attributes.scheduledTaskId);
        } else {
          taskIdsToDisable.push(rule.attributes.scheduledTaskId);
          if (rule.attributes.alertTypeId) {
            const { autoRecoverAlerts: isLifecycleAlert } = context.ruleTypeRegistry.get(
              rule.attributes.alertTypeId
            );
            if (isLifecycleAlert) taskIdsToClearState.push(rule.attributes.scheduledTaskId);
          }
        }
      }
      disabledRules.push(rule);
    } else {
      errors.push({
        message: rule.error.message ?? 'n/a',
        status: rule.error.statusCode,
        rule: {
          id: rule.id,
          name: ruleNameToRuleIdMapping[rule.id] ?? 'n/a',
        },
      });
    }
  });

  return {
    errors,
    // TODO: delete the casting when we do versioning of bulk disable api
    rules: disabledRules as Array<SavedObjectsBulkUpdateObject<RuleAttributes>>,
    accListSpecificForBulkOperation: [taskIdsToDisable, taskIdsToDelete, taskIdsToClearState],
  };
};

const tryToDisableTasks = async ({
  taskIdsToDisable,
  taskIdsToClearState,
  logger,
  taskManager,
}: {
  taskIdsToDisable: string[];
  taskIdsToClearState: string[];
  logger: Logger;
  taskManager: TaskManagerStartContract;
}) => {
  return await withSpan({ name: 'taskManager.bulkDisable', type: 'rules' }, async () => {
    if (taskIdsToDisable.length > 0) {
      try {
        const resultFromDisablingTasks = await taskManager.bulkDisable(
          taskIdsToDisable,
          taskIdsToClearState
        );
        if (resultFromDisablingTasks.tasks.length) {
          logger.debug(
            `Successfully disabled schedules for underlying tasks: ${resultFromDisablingTasks.tasks
              .map((task) => task.id)
              .join(', ')}`
          );
        }
        if (resultFromDisablingTasks.errors.length) {
          logger.error(
            `Failure to disable schedules for underlying tasks: ${resultFromDisablingTasks.errors
              .map((error) => error.id)
              .join(', ')}`
          );
        }
      } catch (error) {
        logger.error(
          `Failure to disable schedules for underlying tasks: ${taskIdsToDisable.join(
            ', '
          )}. TaskManager bulkDisable failed with Error: ${error.message}`
        );
      }
    }
  });
};
