/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { ElasticsearchClient } from 'kibana/server';
import { fetchWithPit } from './fetch_with_pit';
import { AlertsAggregationResponse } from './types';

export interface GetAlertsOptions {
  esClient: ElasticsearchClient;
  signalsIndex: string;
  maxSize: number;
  maxPerPage: number;
}

export const getAlerts = async ({
  esClient,
  signalsIndex,
  maxSize,
  maxPerPage,
}: GetAlertsOptions): Promise<Array<SearchHit<AlertsAggregationResponse>>> => {
  return fetchWithPit<AlertsAggregationResponse>({
    esClient,
    index: signalsIndex,
    maxSize,
    maxPerPage,
    searchRequest: {
      aggs: {
        detectionAlerts: {
          terms: { field: ALERT_RULE_UUID },
        },
      },
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-24h',
                  lte: 'now',
                },
              },
            },
          ],
        },
      },
    },
  });
};
