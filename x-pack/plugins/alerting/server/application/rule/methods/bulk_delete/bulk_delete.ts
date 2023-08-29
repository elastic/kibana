/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { RawRule } from '../../../../types';
import { convertRuleIdsToKueryNode } from '../../../../lib';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { tryToRemoveTasks } from '../../../../rules_client/common';
import { API_KEY_GENERATE_CONCURRENCY } from '../../../../rules_client/common/constants';
import {
  getAuthorizationFilter,
  checkAuthorizationAndGetTotal,
  getAlertFromRaw,
  migrateLegacyActions,
} from '../../../../rules_client/lib';
import {
  retryIfBulkOperationConflicts,
  buildKueryNodeFilter,
} from '../../../../rules_client/common';
import type { RulesClientContext } from '../../../../rules_client/types';
import type {
  BulkOperationErrorV1,
  BulkDeleteRulesResponseV1,
  BulkDeleteRulesRequestParamsV1,
} from '../../../../../common/routes/rule/apis/bulk_delete';
import { getAndValidateCommonBulkOptionsV1 } from '../../../../../common/routes/rule/apis/bulk_delete';

export const bulkDeleteRules = async (
  context: RulesClientContext,
  options: BulkDeleteRulesRequestParamsV1
): Promise<BulkDeleteRulesResponseV1> => {
  const { ids, filter } = getAndValidateCommonBulkOptionsV1(options);

  const kueryNodeFilter = ids ? convertRuleIdsToKueryNode(ids) : buildKueryNodeFilter(filter);
  const authorizationFilter = await getAuthorizationFilter(context, { action: 'DELETE' });

  const kueryNodeFilterWithAuth =
    authorizationFilter && kueryNodeFilter
      ? nodeBuilder.and([kueryNodeFilter, authorizationFilter as KueryNode])
      : kueryNodeFilter;

  const { total } = await checkAuthorizationAndGetTotal(context, {
    filter: kueryNodeFilterWithAuth,
    action: 'DELETE',
  });

  const { rules, errors, accListSpecificForBulkOperation } = await withSpan(
    { name: 'retryIfBulkOperationConflicts', type: 'rules' },
    () =>
      retryIfBulkOperationConflicts({
        action: 'DELETE',
        logger: context.logger,
        bulkOperation: (filterKueryNode: KueryNode | null) =>
          bulkDeleteWithOCC(context, { filter: filterKueryNode }),
        filter: kueryNodeFilterWithAuth,
      })
  );

  const [apiKeysToInvalidate, taskIdsToDelete] = accListSpecificForBulkOperation;

  const [result] = await Promise.allSettled([
    tryToRemoveTasks({
      taskIdsToDelete,
      logger: context.logger,
      taskManager: context.taskManager,
    }),
    bulkMarkApiKeysForInvalidation(
      { apiKeys: apiKeysToInvalidate },
      context.logger,
      context.unsecuredSavedObjectsClient
    ),
  ]);

  const deletedRules = rules.map(({ id, attributes, references }) => {
    return getAlertFromRaw(
      context,
      id,
      attributes.alertTypeId as string,
      attributes as RawRule,
      references,
      false
    );
  });

  if (result.status === 'fulfilled') {
    return { errors, total, rules: deletedRules, taskIdsFailedToBeDeleted: result.value };
  } else {
    return { errors, total, rules: deletedRules, taskIdsFailedToBeDeleted: [] };
  }
};

const bulkDeleteWithOCC = async (
  context: RulesClientContext,
  { filter }: { filter: KueryNode | null }
) => {
  const rulesFinder = await withSpan(
    {
      name: 'encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser',
      type: 'rules',
    },
    () =>
      context.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>({
        filter,
        type: 'alert',
        perPage: 100,
        ...(context.namespace ? { namespaces: [context.namespace] } : undefined),
      })
  );

  const rulesToDelete: Array<SavedObjectsBulkUpdateObject<RawRule>> = [];
  const apiKeyToRuleIdMapping: Record<string, string> = {};
  const taskIdToRuleIdMapping: Record<string, string> = {};
  const ruleNameToRuleIdMapping: Record<string, string> = {};

  await withSpan(
    { name: 'Get rules, collect them and their attributes', type: 'rules' },
    async () => {
      for await (const response of rulesFinder.find()) {
        for (const rule of response.saved_objects) {
          if (rule.attributes.apiKey && !rule.attributes.apiKeyCreatedByUser) {
            apiKeyToRuleIdMapping[rule.id] = rule.attributes.apiKey;
          }
          if (rule.attributes.name) {
            ruleNameToRuleIdMapping[rule.id] = rule.attributes.name;
          }
          if (rule.attributes.scheduledTaskId) {
            taskIdToRuleIdMapping[rule.id] = rule.attributes.scheduledTaskId;
          }
          rulesToDelete.push(rule);

          context.auditLogger?.log(
            ruleAuditEvent({
              action: RuleAuditAction.DELETE,
              outcome: 'unknown',
              savedObject: { type: 'alert', id: rule.id },
            })
          );
        }
      }
      await rulesFinder.close();
    }
  );

  const result = await withSpan(
    { name: 'unsecuredSavedObjectsClient.bulkDelete', type: 'rules' },
    () => context.unsecuredSavedObjectsClient.bulkDelete(rulesToDelete)
  );

  const deletedRuleIds: string[] = [];
  const apiKeysToInvalidate: string[] = [];
  const taskIdsToDelete: string[] = [];
  const errors: BulkOperationErrorV1[] = [];

  result.statuses.forEach((status) => {
    if (status.error === undefined) {
      if (apiKeyToRuleIdMapping[status.id]) {
        apiKeysToInvalidate.push(apiKeyToRuleIdMapping[status.id]);
      }
      if (taskIdToRuleIdMapping[status.id]) {
        taskIdsToDelete.push(taskIdToRuleIdMapping[status.id]);
      }
      deletedRuleIds.push(status.id);
    } else {
      errors.push({
        message: status.error.message ?? 'n/a',
        status: status.error.statusCode,
        rule: {
          id: status.id,
          name: ruleNameToRuleIdMapping[status.id] ?? 'n/a',
        },
      });
    }
  });
  const rules = rulesToDelete.filter((rule) => deletedRuleIds.includes(rule.id));

  // migrate legacy actions only for SIEM rules
  await pMap(
    rules,
    async (rule) => {
      await migrateLegacyActions(context, {
        ruleId: rule.id,
        attributes: rule.attributes as RawRule,
        skipActionsValidation: true,
      });
    },
    // max concurrency for bulk edit operations, that is limited by api key generations, should be sufficient for bulk migrations
    { concurrency: API_KEY_GENERATE_CONCURRENCY }
  );

  return {
    errors,
    rules,
    accListSpecificForBulkOperation: [apiKeysToInvalidate, taskIdsToDelete],
  };
};
