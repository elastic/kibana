/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kqlQuery, termQuery, termsQuery } from '@kbn/observability-plugin/server';
import {
  ALERT_RULE_PRODUCER,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { INFRA_ALERT_FEATURE_ID } from '../../../../../common/constants';
import { BUCKET_KEY, MAX_SIZE } from '../constants';
import { InfraAlertsClient } from '../../../../lib/helpers/get_infra_alerts_client';

export async function getHostsAlertsCount({
  alertsClient,
  hostNamesShortList,
  kuery,
  from,
  to,
  maxNumHosts = MAX_SIZE,
}: {
  alertsClient: InfraAlertsClient;
  hostNamesShortList: string[];
  kuery?: string;
  from: string;
  to: string;
  maxNumHosts?: number;
}) {
  const rangeQuery = [
    {
      range: {
        'kibana.alert.time_range': {
          gte: from,
          lte: to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];
  const params = {
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...termQuery(ALERT_RULE_PRODUCER, INFRA_ALERT_FEATURE_ID),
          ...termQuery(ALERT_STATUS, ALERT_STATUS_ACTIVE),
          ...termsQuery(BUCKET_KEY, ...hostNamesShortList),
          ...rangeQuery,
          ...kqlQuery(kuery),
        ],
      },
    },
    aggs: {
      hosts: {
        terms: {
          field: BUCKET_KEY,
          size: maxNumHosts,
          order: {
            _key: 'asc',
          },
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

  const result = await alertsClient.search(params);

  const filterAggBuckets = result.aggregations?.hosts.buckets ?? [];

  return filterAggBuckets.map((bucket) => ({
    name: bucket.key as string,
    alertsCount: bucket.alerts_count.value,
  }));
}
