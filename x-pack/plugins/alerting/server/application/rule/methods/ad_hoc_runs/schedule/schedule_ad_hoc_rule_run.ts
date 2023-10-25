/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { flatten } from 'lodash';
import Boom from '@hapi/boom';
import { parseDuration } from '@kbn/actions-plugin/server/lib/parse_date';
import { KueryNode, nodeBuilder } from '@kbn/es-query';
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
import type { ScheduleAdHocRuleRunOptions } from './types';
import { scheduleAdHocRuleRunOptionsSchema } from './schemas';

export async function scheduleAdHocRuleRun(
  context: RulesClientContext,
  options: ScheduleAdHocRuleRunOptions
) {
  try {
    scheduleAdHocRuleRunOptionsSchema.validate(options);
  } catch (error) {
    throw Boom.badRequest(`Error validating schedule data - ${error.message}`);
  }

  // Verify valid duration
  try {
    parseDuration(options.intervalDuration);
  } catch (error) {
    throw Boom.badRequest(`Invalid intervalDuration - ${options.intervalDuration}`);
  }

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
        action: RuleAuditAction.SCHEDULE_AD_HOC_RULE_RUN,
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
    throw Boom.badRequest(
      `No rules matching ids ${options.ruleIds} found to schedule ad hoc rule run`
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
          operation: ReadOperations.ScheduleAdHocRuleRun,
          entity: AlertingAuthorizationEntity.Rule,
        });
      } catch (error) {
        context.auditLogger?.log(
          ruleAuditEvent({
            action: RuleAuditAction.SCHEDULE_AD_HOC_RULE_RUN,
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

  const scheduleResponses = [];
  for await (const response of rulesFinder.find()) {
    const scheduleResponse = await context.adHocRuleRunClient.bulkQueue(
      context.unsecuredSavedObjectsClient,
      response.saved_objects,
      context.spaceId,
      options
    );
    scheduleResponses.push([...scheduleResponse]);
  }

  return flatten(scheduleResponses);
}
