/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { SavedObjectsBulkUpdateObject } from '@kbn/core/server';
import { RawRule } from '../../types';
import { convertRuleIdsToKueryNode } from '../../lib';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { getAuthorizationFilter, checkAuthorizationAndGetTotal, getAlertFromRaw } from '../lib';
import {
  retryIfBulkOperationConflicts,
  buildKueryNodeFilter,
  getAndValidateCommonBulkOptions,
} from '../common';
import { BulkOptions, BulkOperationError, RulesClientContext } from '../types';

export const bulkDeleteRules = async (context: RulesClientContext, options: BulkOptions) => {
  const { ids, filter } = getAndValidateCommonBulkOptions(options);

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

  const { rules, errors, accListSpecificForBulkOperation } = await retryIfBulkOperationConflicts({
    action: 'DELETE',
    logger: context.logger,
    bulkOperation: (filterKueryNode: KueryNode | null) =>
      bulkDeleteWithOCC(context, { filter: filterKueryNode }),
    filter: kueryNodeFilterWithAuth,
  });

  const [apiKeysToInvalidate, taskIdsToDelete] = accListSpecificForBulkOperation;

  const taskIdsFailedToBeDeleted: string[] = [];
  const taskIdsSuccessfullyDeleted: string[] = [];
  if (taskIdsToDelete.length > 0) {
    try {
      const resultFromDeletingTasks = await context.taskManager.bulkRemoveIfExist(taskIdsToDelete);
      resultFromDeletingTasks?.statuses.forEach((status) => {
        if (status.success) {
          taskIdsSuccessfullyDeleted.push(status.id);
        } else {
          taskIdsFailedToBeDeleted.push(status.id);
        }
      });
      if (taskIdsSuccessfullyDeleted.length) {
        context.logger.debug(
          `Successfully deleted schedules for underlying tasks: ${taskIdsSuccessfullyDeleted.join(
            ', '
          )}`
        );
      }
      if (taskIdsFailedToBeDeleted.length) {
        context.logger.error(
          `Failure to delete schedules for underlying tasks: ${taskIdsFailedToBeDeleted.join(', ')}`
        );
      }
    } catch (error) {
      context.logger.error(
        `Failure to delete schedules for underlying tasks: ${taskIdsToDelete.join(
          ', '
        )}. TaskManager bulkRemoveIfExist failed with Error: ${error.message}`
      );
    }
  }

  await bulkMarkApiKeysForInvalidation(
    { apiKeys: apiKeysToInvalidate },
    context.logger,
    context.unsecuredSavedObjectsClient
  );

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

  return { errors, rules: deletedRules, total, taskIdsFailedToBeDeleted };
};

const bulkDeleteWithOCC = async (
  context: RulesClientContext,
  { filter }: { filter: KueryNode | null }
) => {
  const rulesFinder =
    await context.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RawRule>(
      {
        filter,
        type: 'alert',
        perPage: 100,
        ...(context.namespace ? { namespaces: [context.namespace] } : undefined),
      }
    );

  const rulesToDelete: Array<SavedObjectsBulkUpdateObject<RawRule>> = [];
  const apiKeysToInvalidate: string[] = [];
  const taskIdsToDelete: string[] = [];
  const errors: BulkOperationError[] = [];
  const apiKeyToRuleIdMapping: Record<string, string> = {};
  const taskIdToRuleIdMapping: Record<string, string> = {};
  const ruleNameToRuleIdMapping: Record<string, string> = {};

  for await (const response of rulesFinder.find()) {
    for (const rule of response.saved_objects) {
      if (rule.attributes.apiKey) {
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

  const result = await context.unsecuredSavedObjectsClient.bulkDelete(rulesToDelete);

  const deletedRuleIds: string[] = [];

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

  return {
    errors,
    rules,
    accListSpecificForBulkOperation: [apiKeysToInvalidate, taskIdsToDelete],
  };
};
