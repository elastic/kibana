/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { RuleAttributes } from '../../../../data/rule/types';
import { AlertingAuthorizationEntity } from '../../../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { buildKueryNodeFilter } from '../../../../rules_client/common';
import { alertingAuthorizationFilterOpts } from '../../../../rules_client/common/constants';
import { RulesClientContext } from '../../../../rules_client/types';

import type { AggregateParams } from './types';
import { validateRuleAggregationFields } from './validation';

export async function aggregate<T = Record<string, unknown>>(
  context: RulesClientContext,
  params: AggregateParams<T>
): Promise<T> {
  const { options = {}, aggs } = params;
  const { filter, page = 1, perPage = 0, ...restOptions } = options;

  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter(
      AlertingAuthorizationEntity.Rule,
      alertingAuthorizationFilterOpts
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

  const result = await context.unsecuredSavedObjectsClient.find<RuleAttributes, T>({
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

  return result.aggregations!;
}
