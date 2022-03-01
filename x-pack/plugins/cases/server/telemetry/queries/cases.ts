/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { CollectTelemetryDataParams, Buckets, CasesTelemetry } from '../types';
import { getCountsAggregationQuery, getCountsFromBuckets } from './utils';

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
      syncAlerts: Buckets;
      status: Buckets;
    }
  >({
    page: 0,
    perPage: 0,
    type: CASE_SAVED_OBJECT,
    aggs: {
      ...byOwnerAggregationQuery,
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

  const obsCountsBuckets = res.aggregations?.observability?.counts?.buckets ?? [];
  const secCountsBuckets = res.aggregations?.securitySolution?.counts?.buckets ?? [];
  const syncAlertsBuckets = res.aggregations?.syncAlerts?.buckets ?? [];
  const statusBuckets = res.aggregations?.status?.buckets ?? [];

  return {
    all: {
      total: res.total,
      '1d': 0,
      '1w': 0,
      '1m': 0,
      status: {
        open: statusBuckets.find(({ key }) => key === 'open')?.doc_count ?? 0,
        inProgress: statusBuckets.find(({ key }) => key === 'in-progress')?.doc_count ?? 0,
        closed: statusBuckets.find(({ key }) => key === 'closed')?.doc_count ?? 0,
      },
    },
    sec: {
      total: 0,
      ...getCountsFromBuckets(secCountsBuckets),
    },
    obs: {
      total: 0,
      ...getCountsFromBuckets(obsCountsBuckets),
    },
    main: { total: 0, '1d': 0, '1w': 0, '1m': 0 },
    syncAlertsOn: syncAlertsBuckets.find(({ key }) => key === 1)?.doc_count ?? 0,
    syncAlertsOff: syncAlertsBuckets.find(({ key }) => key === 0)?.doc_count ?? 0,
  };
};
