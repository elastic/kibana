/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import Boom from '@hapi/boom';
import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { SavedObjectsFindResult } from '@kbn/core/server';
import { RuleAttributes } from '../../../../../data/rule/types';
import { findRulesSo } from '../../../../../data/rule';
import {
  alertingAuthorizationFilterOpts,
  RULE_TYPE_CHECKS_CONCURRENCY,
} from '../../../../../rules_client/common/constants';
import { convertRuleIdsToKueryNode } from '../../../../../lib';
import { RuleBulkOperationAggregation, RulesClientContext } from '../../../../../rules_client';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../../../../../rules_client/common/audit_events';
import type { ScheduleBackfillOptions, ScheduleBackfillResults } from './types';
import { scheduleBackfillOptionsSchema } from './schemas';
import { transformRuleAttributesToRuleDomain } from '../../../transforms';

export async function scheduleBackfill(
  context: RulesClientContext,
  options: ScheduleBackfillOptions
): Promise<ScheduleBackfillResults> {
  try {
    scheduleBackfillOptionsSchema.validate(options);
  } catch (error) {
    throw Boom.badRequest(`Error validating schedule data - ${error.message}`);
  }

  // Get the rule SOs
  const kueryNodeFilter = convertRuleIdsToKueryNode(options.ruleIds);
  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter(
      AlertingAuthorizationEntity.Rule,
      alertingAuthorizationFilterOpts
    );
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.SCHEDULE_BACKFILL,
        error,
      })
    );
    throw error;
  }
  const { filter: authorizationFilter } = authorizationTuple;
  const kueryNodeFilterWithAuth =
    authorizationFilter && kueryNodeFilter
      ? nodeBuilder.and([kueryNodeFilter, authorizationFilter as KueryNode])
      : kueryNodeFilter;

  const { aggregations } = await findRulesSo<RuleBulkOperationAggregation>({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    savedObjectsFindOptions: {
      filter: kueryNodeFilterWithAuth,
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

  const buckets = aggregations?.alertTypeId.buckets;
  if (buckets === undefined || !buckets.length) {
    throw Boom.badRequest(`No rules matching ids ${options.ruleIds} found to schedule backfill`);
  }

  const lifecycleRuleTypes = buckets.filter(
    ({ key: [ruleTypeId] }) => context.ruleTypeRegistry.get(ruleTypeId).autoRecoverAlerts ?? true
  );
  if (lifecycleRuleTypes.length > 0) {
    throw Boom.badRequest(
      `Cannot schedule backfill for rule types [${lifecycleRuleTypes
        .map(({ key: [ruleTypeId] }) => ruleTypeId)
        .join(',')}] - unsupported rule type`
    );
  }

  await pMap(
    buckets,
    async ({ key: [ruleType, consumer] }) => {
      context.ruleTypeRegistry.ensureRuleTypeEnabled(ruleType);

      try {
        await context.authorization.ensureAuthorized({
          ruleTypeId: ruleType,
          consumer,
          operation: ReadOperations.ScheduleBackfill,
          entity: AlertingAuthorizationEntity.Rule,
        });
      } catch (error) {
        context.auditLogger?.log(
          ruleAuditEvent({
            action: RuleAuditAction.SCHEDULE_BACKFILL,
            error,
          })
        );
        throw error;
      }
    },
    { concurrency: RULE_TYPE_CHECKS_CONCURRENCY }
  );

  const rulesFinder =
    await context.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<RuleAttributes>(
      {
        filter: kueryNodeFilterWithAuth,
        type: 'alert',
        perPage: 100,
        ...(context.namespace ? { namespaces: [context.namespace] } : undefined),
      }
    );

  let rulesToSchedule: Array<SavedObjectsFindResult<RuleAttributes>> = [];
  for await (const response of rulesFinder.find()) {
    const anyDisabledRules = response.saved_objects.filter(({ attributes }) => !attributes.enabled);
    if (anyDisabledRules.length > 0) {
      throw Boom.badRequest(
        `Cannot schedule backfill for rules [${anyDisabledRules
          .map(({ id }) => id)
          .join(',')}] - rule is disabled`
      );
    }
    rulesToSchedule = [...response.saved_objects];
  }

  const scheduleResponses = await context.backfillClient.bulkQueue({
    unsecuredSavedObjectsClient: context.unsecuredSavedObjectsClient,
    ruleTypeRegistry: context.ruleTypeRegistry,
    rules: rulesToSchedule.map(({ id, attributes, references }) => {
      const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId!);
      return transformRuleAttributesToRuleDomain(attributes as RuleAttributes, {
        id,
        logger: context.logger,
        ruleType,
        references,
        omitGeneratedValues: false,
      });
    }),
    spaceId: context.spaceId,
    options,
  });

  return scheduleResponses;
}
