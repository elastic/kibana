/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenPointInTimeResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  AggregationsCompositeAggregation,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from 'kibana/server';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { AlertBucket, AlertAggs } from '../types';

export interface GetAlertsOptions {
  esClient: ElasticsearchClient;
  signalsIndex: string;
  maxSize: number;
  maxPerPage: number;
  logger: Logger;
}

export const getAlerts = async ({
  esClient,
  signalsIndex,
  maxSize,
  maxPerPage,
  logger,
}: GetAlertsOptions): Promise<AlertBucket[]> => {
  // default is from looking at Kibana saved objects and online documentation
  const keepAlive = '5m';

  // create and assign an initial point in time
  let pitId: OpenPointInTimeResponse['id'] = (
    await esClient.openPointInTime({
      index: signalsIndex,
      keep_alive: keepAlive,
    })
  ).id;

  let after: AggregationsCompositeAggregation['after'];
  let buckets: AlertBucket[] = [];
  let fetchMore = true;
  while (fetchMore) {
    const ruleSearchOptions: SearchRequest = {
      aggs: {
        buckets: {
          composite: {
            size: Math.min(maxPerPage, maxSize - buckets.length),
            sources: [
              {
                detectionAlerts: {
                  terms: {
                    field: ALERT_RULE_UUID,
                  },
                },
              },
            ],
            after,
          },
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
      track_total_hits: false,
      sort: [{ _shard_doc: 'desc' }] as unknown as string[], // TODO: Remove this "unknown" once it is typed correctly https://github.com/elastic/elasticsearch-js/issues/1589
      pit: { id: pitId },
      size: 0,
    };
    logger.debug(
      `Getting alerts with point in time (PIT) query: ${JSON.stringify(ruleSearchOptions)}`
    );
    const body = await esClient.search<unknown, AlertAggs>(ruleSearchOptions);
    if (body.aggregations?.buckets?.buckets != null) {
      buckets = [...buckets, ...body.aggregations.buckets.buckets];
    }
    if (body.aggregations?.buckets?.after_key != null) {
      after = {
        detectionAlerts: body.aggregations.buckets.after_key.detectionAlerts,
      };
    }

    fetchMore =
      body.aggregations?.buckets?.buckets != null &&
      body.aggregations?.buckets?.buckets.length !== 0 &&
      buckets.length < maxSize;
    if (body.pit_id != null) {
      pitId = body.pit_id;
    }
  }
  try {
    await esClient.closePointInTime({ id: pitId });
  } catch (error) {
    // Don't fail due to a bad point in time closure. We have seen failures in e2e tests during nominal operations.
    logger.warn(
      `Error trying to close point in time: "${pitId}", it will expire within "${keepAlive}". Error is: "${error}"`
    );
  }
  logger.debug(`Returning alerts response of length: "${buckets.length}"`);
  return buckets;
};
