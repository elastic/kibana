/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode, nodeBuilder } from '@kbn/es-query';
import { RawRule, RuleExecutionStatusValues, RuleLastRunOutcomeValues } from '../../types';
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
  maxTags?: number;
}

interface IndexType {
  [key: string]: unknown;
}

export interface AggregateResult {
  alertExecutionStatus: { [status: string]: number };
  ruleLastRunOutcome: { [status: string]: number };
  ruleEnabledStatus?: { enabled: number; disabled: number };
  ruleMutedStatus?: { muted: number; unmuted: number };
  ruleSnoozedStatus?: { snoozed: number };
  ruleTags?: string[];
}

export interface RuleAggregation {
  status: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  outcome: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  muted: {
    buckets: Array<{
      key: number;
      key_as_string: string;
      doc_count: number;
    }>;
  };
  enabled: {
    buckets: Array<{
      key: number;
      key_as_string: string;
      doc_count: number;
    }>;
  };
  snoozed: {
    count: {
      doc_count: number;
    };
  };
  tags: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export async function aggregate(
  context: RulesClientContext,
  {
    options: { fields, filter, maxTags = 50, ...options } = {},
  }: { options?: AggregateOptions } = {}
): Promise<AggregateResult> {
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
  const filterKueryNode = buildKueryNodeFilter(filter);

  const resp = await context.unsecuredSavedObjectsClient.find<RawRule, RuleAggregation>({
    ...options,
    filter:
      authorizationFilter && filterKueryNode
        ? nodeBuilder.and([filterKueryNode, authorizationFilter as KueryNode])
        : authorizationFilter,
    page: 1,
    perPage: 0,
    type: 'alert',
    aggs: {
      status: {
        terms: { field: 'alert.attributes.executionStatus.status' },
      },
      outcome: {
        terms: { field: 'alert.attributes.lastRun.outcome' },
      },
      enabled: {
        terms: { field: 'alert.attributes.enabled' },
      },
      muted: {
        terms: { field: 'alert.attributes.muteAll' },
      },
      tags: {
        terms: { field: 'alert.attributes.tags', order: { _key: 'asc' }, size: maxTags },
      },
      snoozed: {
        nested: {
          path: 'alert.attributes.snoozeSchedule',
        },
        aggs: {
          count: {
            filter: {
              exists: {
                field: 'alert.attributes.snoozeSchedule.duration',
              },
            },
          },
        },
      },
    },
  });

  if (!resp.aggregations) {
    // Return a placeholder with all zeroes
    const placeholder: AggregateResult = {
      alertExecutionStatus: {},
      ruleLastRunOutcome: {},
      ruleEnabledStatus: {
        enabled: 0,
        disabled: 0,
      },
      ruleMutedStatus: {
        muted: 0,
        unmuted: 0,
      },
      ruleSnoozedStatus: { snoozed: 0 },
    };

    for (const key of RuleExecutionStatusValues) {
      placeholder.alertExecutionStatus[key] = 0;
    }

    return placeholder;
  }

  const alertExecutionStatus = resp.aggregations.status.buckets.map(
    ({ key, doc_count: docCount }) => ({
      [key]: docCount,
    })
  );

  const ruleLastRunOutcome = resp.aggregations.outcome.buckets.map(
    ({ key, doc_count: docCount }) => ({
      [key]: docCount,
    })
  );

  const ret: AggregateResult = {
    alertExecutionStatus: alertExecutionStatus.reduce(
      (acc, curr: { [status: string]: number }) => Object.assign(acc, curr),
      {}
    ),
    ruleLastRunOutcome: ruleLastRunOutcome.reduce(
      (acc, curr: { [status: string]: number }) => Object.assign(acc, curr),
      {}
    ),
  };

  // Fill missing keys with zeroes
  for (const key of RuleExecutionStatusValues) {
    if (!ret.alertExecutionStatus.hasOwnProperty(key)) {
      ret.alertExecutionStatus[key] = 0;
    }
  }
  for (const key of RuleLastRunOutcomeValues) {
    if (!ret.ruleLastRunOutcome.hasOwnProperty(key)) {
      ret.ruleLastRunOutcome[key] = 0;
    }
  }

  const enabledBuckets = resp.aggregations.enabled.buckets;
  ret.ruleEnabledStatus = {
    enabled: enabledBuckets.find((bucket) => bucket.key === 1)?.doc_count ?? 0,
    disabled: enabledBuckets.find((bucket) => bucket.key === 0)?.doc_count ?? 0,
  };

  const mutedBuckets = resp.aggregations.muted.buckets;
  ret.ruleMutedStatus = {
    muted: mutedBuckets.find((bucket) => bucket.key === 1)?.doc_count ?? 0,
    unmuted: mutedBuckets.find((bucket) => bucket.key === 0)?.doc_count ?? 0,
  };

  ret.ruleSnoozedStatus = {
    snoozed: resp.aggregations.snoozed?.count?.doc_count ?? 0,
  };

  const tagsBuckets = resp.aggregations.tags?.buckets || [];
  ret.ruleTags = tagsBuckets.map((bucket) => bucket.key);

  return ret;
}
