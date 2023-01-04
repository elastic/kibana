/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AlertingAuthorizationEntity } from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import { buildKueryNodeFilter } from '../common';
import { alertingAuthorizationFilterOpts } from '../common/constants';
import { RulesClientContext } from '../types';

export interface AggregateOptions extends IndexType {
  search?: string;
  defaultSearchOperator?: 'AND' | 'OR';
  searchFields?: string[];
  hasReference?: {
    type: string;
    id: string;
  };
  filter?: string | KueryNode;
}

interface IndexType {
  [key: string]: unknown;
}

export type Aggregations<Keys extends string> = Record<Keys, AggregationsAggregationContainer>;

export async function aggregate<AggregationsResult = Record<string, unknown>>(
  context: RulesClientContext,
  aggs: Record<keyof AggregationsResult, AggregationsAggregationContainer>,
  options?: AggregateOptions
): Promise<AggregationsResult | undefined> {
  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter(
      AlertingAuthorizationEntity.Rule,
      alertingAuthorizationFilterOpts
    );
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
  const filterKueryNode = buildKueryNodeFilter(options?.filter);
  const result = await context.unsecuredSavedObjectsClient.find<unknown, AggregationsResult>({
    ...options,
    filter:
      authorizationFilter && filterKueryNode
        ? nodeBuilder.and([filterKueryNode, authorizationFilter as KueryNode])
        : authorizationFilter,
    page: 1,
    perPage: 0,
    type: 'alert',
    aggs,
  });

  return result.aggregations;
}
