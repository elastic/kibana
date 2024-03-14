/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_PRODUCER,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_RULE_PARAMETERS,
} from '@kbn/rule-data-utils';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/features/apm/es_fields/apm';
import { LatencyAggregationType } from '../../../../../common/features/apm/latency_aggregation_types';
import { AggregationType } from '../../../../../common/features/apm/rules/apm_rule_types';
import { environmentQuery } from '../../../../../common/features/apm/utils/environment_query';
import {
  kqlQuery,
  rangeQuery,
  termQuery,
  wildcardQuery,
} from '../../../alerts_and_slos/utils/queries';
import { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { MAX_NUMBER_OF_TX_GROUPS } from './get_service_transaction_groups';

export type ServiceTransactionGroupAlertsResponse = Array<{
  name: string;
  alertsCount: number;
}>;

const RuleAggregationType = {
  [LatencyAggregationType.avg]: AggregationType.Avg,
  [LatencyAggregationType.p99]: AggregationType.P99,
  [LatencyAggregationType.p95]: AggregationType.P95,
} as const;

export async function getServiceTransactionGroupsAlerts({
  apmAlertsClient,
  kuery,
  transactionType,
  serviceName,
  latencyAggregationType,
  start,
  end,
  environment,
  searchQuery,
}: {
  apmAlertsClient: ApmAlertsClient;
  kuery?: string;
  serviceName?: string;
  transactionType?: string;
  latencyAggregationType: LatencyAggregationType;
  start: number;
  end: number;
  environment?: string;
  searchQuery?: string;
}): Promise<ServiceTransactionGroupAlertsResponse> {
  const ALERT_RULE_PARAMETERS_AGGREGATION_TYPE = `${ALERT_RULE_PARAMETERS}.aggregationType`;

  const params = {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...termQuery(ALERT_RULE_PRODUCER, 'apm'),
          ...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE),
          ...rangeQuery(start, end),
          ...kqlQuery(kuery),
          ...termQuery(SERVICE_NAME, serviceName),
          ...termQuery(TRANSACTION_TYPE, transactionType),
          ...environmentQuery(environment),
          ...wildcardQuery(TRANSACTION_NAME, searchQuery),
        ],
        must: [
          {
            bool: {
              should: [
                ...termQuery(
                  ALERT_RULE_PARAMETERS_AGGREGATION_TYPE,
                  RuleAggregationType[latencyAggregationType]
                ),
                {
                  bool: {
                    must_not: [
                      {
                        exists: {
                          field: ALERT_RULE_PARAMETERS_AGGREGATION_TYPE,
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    aggs: {
      transaction_groups: {
        terms: {
          field: TRANSACTION_NAME,
          size: MAX_NUMBER_OF_TX_GROUPS,
          order: { _count: 'desc' },
        },
      },
    },
  };

  const response = await apmAlertsClient.search(params);

  const buckets = response?.aggregations?.transaction_groups.buckets ?? [];

  const servicesTransactionGroupsAlertsCount =
    buckets.map((bucket) => ({
      name: bucket.key as string,
      alertsCount: bucket.doc_count,
    })) ?? [];

  return servicesTransactionGroupsAlertsCount;
}
