/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode, nodeBuilder } from '@kbn/es-query';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isEmpty } from 'lodash';
import { AlertingAuthorizationEntity } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { buildKueryNodeFilter } from '../common';
import { alertingAuthorizationFilterOpts } from '../common/constants';
import { RulesClientContext } from '../types';
import { RawRule, AggregateOptions } from '../../types';
import { validateRuleAggregationFields } from '../lib/validate_rule_aggregation_fields';

export interface AggregateParams<AggregationResult> {
  options?: AggregateOptions;
  aggs: Record<keyof AggregationResult, AggregationsAggregationContainer>;
}

export async function aggregate<T = Record<string, unknown>>(
  context: RulesClientContext,
  params: AggregateParams<T>
): Promise<T> {
  const { options = {}, aggs } = params;
  const { filter, page = 1, perPage = 0, filterConsumers, ...restOptions } = options;

  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter(
      AlertingAuthorizationEntity.Rule,
      alertingAuthorizationFilterOpts,
      isEmpty(filterConsumers) ? undefined : new Set(filterConsumers)
    );
    validateRuleAggregationFields(aggs);
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.AGGREGATE,
        error,
      })
    );
    throw error;
  }

  const { filter: authorizationFilter } = authorizationTuple;
  const filterKueryNode = buildKueryNodeFilter(filter);

  const result = await context.unsecuredSavedObjectsClient.find<RawRule, T>({
    ...restOptions,
    filter:
      authorizationFilter && filterKueryNode
        ? nodeBuilder.and([filterKueryNode, authorizationFilter as KueryNode])
        : authorizationFilter,
    page,
    perPage,
    type: 'alert',
    aggs,
  });

  // params.
  return result.aggregations!;
}
