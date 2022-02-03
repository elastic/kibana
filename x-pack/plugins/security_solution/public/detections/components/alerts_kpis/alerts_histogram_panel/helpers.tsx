/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isEmpty } from 'lodash/fp';
import moment from 'moment';

import type { HistogramData, AlertsAggregation, AlertsBucket, AlertsGroupBucket } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';

const EMPTY_ALERTS_DATA: HistogramData[] = [];

export const formatAlertsData = (alertsData: AlertSearchResponse<{}, AlertsAggregation> | null) => {
  const groupBuckets: AlertsGroupBucket[] =
    alertsData?.aggregations?.alertsByGrouping?.buckets ?? [];
  return groupBuckets.reduce<HistogramData[]>((acc, { key: group, alerts }) => {
    const alertsBucket: AlertsBucket[] = alerts.buckets ?? [];

    return [
      ...acc,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ...alertsBucket.map(({ key, doc_count }: AlertsBucket) => ({
        x: key,
        y: doc_count,
        g: group,
      })),
    ];
  }, EMPTY_ALERTS_DATA);
};

export const getAlertsHistogramQuery = (
  stackByField: string,
  from: string,
  to: string,
  additionalFilters: Array<{
    bool: { filter: unknown[]; should: unknown[]; must_not: unknown[]; must: unknown[] };
  }>,
  runtimeMappings?: MappingRuntimeFields
) => {
  return {
    aggs: {
      alertsByGrouping: {
        terms: {
          field: stackByField,
          order: {
            _count: 'desc',
          },
          size: 10,
        },
        aggs: {
          alerts: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: `${Math.floor(moment(to).diff(moment(from)) / 32)}ms`,
              min_doc_count: 0,
              extended_bounds: {
                min: from,
                max: to,
              },
            },
          },
        },
      },
    },
    query: {
      bool: {
        filter: [
          ...additionalFilters,
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
        ],
      },
    },
    runtime_mappings: runtimeMappings,
  };
};

/**
 * Returns `true` when the alerts histogram initial loading spinner should be shown
 *
 * @param isInitialLoading The loading spinner will only be displayed if this value is `true`, because after initial load, a different, non-spinner loading indicator is displayed
 * @param isLoadingAlerts When `true`, IO is being performed to request alerts (for rendering in the histogram)
 */
export const showInitialLoadingSpinner = ({
  isInitialLoading,
  isLoadingAlerts,
}: {
  isInitialLoading: boolean;
  isLoadingAlerts: boolean;
}): boolean => isInitialLoading && isLoadingAlerts;

export const parseCombinedQueries = (query?: string) => {
  try {
    return query != null && !isEmpty(query) ? JSON.parse(query) : {};
  } catch {
    return {};
  }
};

export const buildCombinedQueries = (query?: string) => {
  try {
    return isEmpty(query) ? [] : [parseCombinedQueries(query)];
  } catch {
    return [];
  }
};
