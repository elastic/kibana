/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';

import { showAllOthersBucket } from '../../../../common/constants';
import { HistogramData, AlertsAggregation, AlertsBucket, AlertsGroupBucket } from './types';
import { AlertSearchResponse } from '../../containers/detection_engine/alerts/types';
import * as i18n from './translations';

export const formatAlertsData = (alertsData: AlertSearchResponse<{}, AlertsAggregation> | null) => {
  const groupBuckets: AlertsGroupBucket[] =
    alertsData?.aggregations?.alertsByGrouping?.buckets ?? [];
  return groupBuckets.reduce<HistogramData[]>((acc, { key: group, alerts }) => {
    const alertsBucket: AlertsBucket[] = alerts.buckets ?? [];

    return [
      ...acc,
      ...alertsBucket.map(({ key, doc_count }: AlertsBucket) => ({
        x: key,
        y: doc_count,
        g: group,
      })),
    ];
  }, []);
};

export const getAlertsHistogramQuery = (
  stackByField: string,
  from: string,
  to: string,
  additionalFilters: Array<{
    bool: { filter: unknown[]; should: unknown[]; must_not: unknown[]; must: unknown[] };
  }>
) => {
  const missing = showAllOthersBucket.includes(stackByField)
    ? {
        missing: stackByField.endsWith('.ip') ? '0.0.0.0' : i18n.ALL_OTHERS,
      }
    : {};

  return {
    aggs: {
      alertsByGrouping: {
        terms: {
          field: stackByField,
          ...missing,
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
