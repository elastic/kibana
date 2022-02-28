/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../common/constants';
import { CollectTelemetryDataParams } from '../types';
import { getCountsAggregationQuery } from './utils';

interface Buckets {
  buckets: Array<{
    doc_count: number;
    key: number | string;
  }>;
}

export const getCasesTelemetryData = async ({ savedObjectsClient }: CollectTelemetryDataParams) => {
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
    },
  });

  const obsCountsBuckets = res.aggregations?.observability?.counts?.buckets ?? [];
  const secCountsBuckets = res.aggregations?.securitySolution?.counts?.buckets ?? [];
  const syncAlertsBuckets = res.aggregations?.syncAlerts?.buckets ?? [];

  return {
    all: {
      all: res.total,
      '1d': 0,
      '1w': 0,
      '1m': 0,
    },
    sec: {
      all: 0,
      '1d': secCountsBuckets?.[2]?.doc_count ?? 0,
      '1w': secCountsBuckets?.[1]?.doc_count ?? 0,
      '1m': secCountsBuckets?.[0]?.doc_count ?? 0,
    },
    obs: {
      all: 0,
      '1d': obsCountsBuckets?.[2]?.doc_count ?? 0,
      '1w': obsCountsBuckets?.[1]?.doc_count ?? 0,
      '1m': obsCountsBuckets?.[0]?.doc_count ?? 0,
    },
    main: { all: 0, '1d': 0, '1w': 0, '1m': 0 },
    syncAlertsOn: syncAlertsBuckets.find(({ key }) => key === 1)?.doc_count ?? 0,
    syncAlertsOff: syncAlertsBuckets.find(({ key }) => key === 0)?.doc_count ?? 0,
  };
};
