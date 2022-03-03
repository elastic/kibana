/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { CollectTelemetryDataParams, Buckets, CasesTelemetry } from '../types';
import {
  findValueInBuckets,
  getAggregationsBuckets,
  getCountsAggregationQuery,
  getCountsFromBuckets,
} from './utils';

export const getCasesTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['cases']> => {
  const owners = ['observability', 'securitySolution'] as const;
  const byOwnerAggregationQuery = owners.reduce(
    (aggQuery, owner) => ({
      ...aggQuery,
      [owner]: {
        filter: {
          term: {
            [`${CASE_SAVED_OBJECT}.attributes.owner`]: owner,
          },
        },
        aggs: getCountsAggregationQuery(CASE_SAVED_OBJECT),
      },
    }),
    {}
  );

  const res = await savedObjectsClient.find<
    unknown,
    Record<typeof owners[number], { counts: Buckets }> & {
      counts: Buckets;
      syncAlerts: Buckets;
      status: Buckets;
    }
  >({
    page: 0,
    perPage: 0,
    type: CASE_SAVED_OBJECT,
    aggs: {
      ...byOwnerAggregationQuery,
      ...getCountsAggregationQuery(CASE_SAVED_OBJECT),
      totalsByOwner: {
        terms: { field: `${CASE_SAVED_OBJECT}.attributes.owner` },
      },
      syncAlerts: {
        terms: { field: `${CASE_SAVED_OBJECT}.attributes.settings.syncAlerts` },
      },
      status: {
        terms: {
          field: `${CASE_SAVED_OBJECT}.attributes.status`,
        },
      },
    },
  });

  const aggregationsBuckets = getAggregationsBuckets({
    aggs: res.aggregations,
    keys: [
      'counts',
      'observability.counts',
      'securitySolution.counts',
      'syncAlerts',
      'status',
      'totalsByOwner',
    ],
  });

  return {
    all: {
      total: res.total,
      ...getCountsFromBuckets(aggregationsBuckets.counts),
      status: {
        open: findValueInBuckets(aggregationsBuckets.status, 'open'),
        inProgress: findValueInBuckets(aggregationsBuckets.status, 'in-progress'),
        closed: findValueInBuckets(aggregationsBuckets.status, 'closed'),
      },
    },
    sec: {
      total: findValueInBuckets(aggregationsBuckets.totalsByOwner, 'securitySolution'),
      ...getCountsFromBuckets(aggregationsBuckets['securitySolution.counts']),
    },
    obs: {
      total: findValueInBuckets(aggregationsBuckets.totalsByOwner, 'observability'),
      ...getCountsFromBuckets(aggregationsBuckets['observability.counts']),
    },
    main: { total: 0, daily: 0, weekly: 0, monthly: 0 },
    syncAlertsOn: findValueInBuckets(aggregationsBuckets.syncAlerts, 1),
    syncAlertsOff: findValueInBuckets(aggregationsBuckets.syncAlerts, 0),
  };
};
