/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import moment, { Moment } from 'moment';
import { createEsParams, UptimeEsClient } from '../../../lib';
import { FINAL_SUMMARY_FILTER, getRangeFilter } from '../../../../common/constants/client_defaults';
import { OverviewPing } from '../../../../common/runtime_types';

const fields = [
  '@timestamp',
  'summary',
  'monitor',
  'observer',
  'config_id',
  'error',
  'agent',
  'url',
  'state',
];

export async function queryMonitorLastRun(
  esClient: UptimeEsClient,
  pendingConfigs: Array<{
    configId: string;
    locationId: string;
    monitorQueryId: string;
  }>,
  maxRange: Moment
) {
  // if max range is before 7 days, we will query for the last 7 days
  const from = maxRange.isBefore(moment().subtract(7, 'days'))
    ? moment().subtract(7, 'days').toISOString()
    : maxRange.toISOString();

  const params = createEsParams({
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            FINAL_SUMMARY_FILTER,
            getRangeFilter({ from, to: moment().toISOString() }),
            {
              terms: {
                'monitor.id': pendingConfigs.map((config) => config.monitorQueryId),
              },
            },
            {
              terms: {
                'observer.name': pendingConfigs.map((config) => config.locationId),
              },
            },
          ] as QueryDslQueryContainer[],
        },
      },
      aggs: {
        ids: {
          terms: {
            field: 'monitor.id',
            size: pendingConfigs.length,
          },
          aggs: {
            location: {
              terms: {
                field: 'observer.name',
                size: 100,
              },
              aggs: {
                summaryDoc: {
                  top_hits: {
                    size: 1,
                    sort: [
                      {
                        '@timestamp': {
                          order: 'desc',
                        },
                      },
                    ],
                    _source: {
                      includes: fields,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const { body: result } = await esClient.search<OverviewPing, typeof params>(params);

  const lastFoundRuns: Array<{
    monitorQueryId: string;
    locationId: string;
    timestamp: string;
    ping: OverviewPing;
  }> = [];

  result.aggregations?.ids.buckets.forEach((monitorBucket) => {
    const monitorId = monitorBucket.key as string;
    monitorBucket.location.buckets.forEach((locationBucket) => {
      const locationId = locationBucket.key as string;
      // only push if it's a missing pending config
      if (
        pendingConfigs.find(
          (config) => config.monitorQueryId === monitorId && config.locationId === locationId
        )
      ) {
        const summaryDoc = locationBucket.summaryDoc.hits.hits[0]._source;
        lastFoundRuns.push({
          monitorQueryId: monitorId,
          locationId,
          timestamp: summaryDoc['@timestamp'],
          ping: summaryDoc,
        });
      }
    });
  });

  return {
    lastFoundRuns,
  };
}
