/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { termQuery, rangeQuery, wildcardQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_TIME_RANGE,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { SERVICE_NAME, TRANSACTION_NAME, TRANSACTION_TYPE } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getAlertsBadgeEndMs } from '../../utils/get_alerts_badge_end';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { MAX_NUMBER_OF_TX_GROUPS } from './get_service_transaction_groups';

export type ServiceTransactionGroupAlertsResponse = Array<{
  name: string;
  alertsCount: number;
}>;

/**
 * Active-alert counts per transaction.name for the transactions table.
 * Matches service-level badge time/status/metric semantics (ALERT_TIME_RANGE + cardinality).
 * Uses plain environmentQuery (no SLO burn-rate env carve-out — those alerts are not
 * transaction-scoped). Scoped by transaction.type; ignores page kuery and latency mode.
 */
export async function getServiceTransactionGroupsAlerts({
  apmAlertsClient,
  transactionType,
  serviceName,
  start,
  end,
  environment,
  searchQuery,
}: {
  apmAlertsClient: ApmAlertsClient;
  serviceName?: string;
  transactionType?: string;
  start: number;
  end: number;
  environment?: string;
  searchQuery?: string;
}): Promise<ServiceTransactionGroupAlertsResponse> {
  const badgesEnd = getAlertsBadgeEndMs(end);

  const params = {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE),
          ...rangeQuery(start, badgesEnd, ALERT_TIME_RANGE),
          ...termQuery(SERVICE_NAME, serviceName),
          ...termQuery(TRANSACTION_TYPE, transactionType),
          ...environmentQuery(environment),
          ...wildcardQuery(TRANSACTION_NAME, searchQuery),
        ],
      },
    },
    aggs: {
      transaction_groups: {
        terms: {
          field: TRANSACTION_NAME,
          size: MAX_NUMBER_OF_TX_GROUPS,
          // Order by unique-alert cardinality (not doc_count) so top-N cutoff
          // matches the badge metric when there are more groups than size.
          order: { alerts_count: 'desc' as const },
        },
        aggs: {
          alerts_count: {
            cardinality: {
              field: ALERT_UUID,
            },
          },
        },
      },
    },
  };

  const response = await apmAlertsClient.search(params);

  const buckets = response?.aggregations?.transaction_groups.buckets ?? [];

  return buckets.map((bucket) => ({
    name: bucket.key as string,
    alertsCount: bucket.alerts_count.value,
  }));
}
