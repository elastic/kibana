/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { useTimeZone } from '@kbn/observability-shared-plugin/public';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useSelectedLocation } from './use_selected_location';
import { PingState } from '../../../../../../common/runtime_types';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
} from '../../../../../../common/constants/client_defaults';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { useGetUrlParams } from '../../../hooks';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';

export function useMonitorErrors(monitorIdArg?: string) {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitorId } = useParams<{ monitorId: string }>();

  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const selectedLocation = useSelectedLocation();

  const timeZone = useTimeZone();

  const { data, loading } = useReduxEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              SUMMARY_FILTER,
              EXCLUDE_RUN_ONCE_FILTER,
              {
                range: {
                  '@timestamp': {
                    gte: dateRangeStart,
                    lte: dateRangeEnd,
                    time_zone: timeZone,
                  },
                },
              },
              {
                term: {
                  'state.up': 0,
                },
              },
              {
                term: {
                  config_id: monitorIdArg ?? monitorId,
                },
              },
              {
                term: {
                  'observer.geo.name': selectedLocation?.label,
                },
              },
            ],
          },
        },
        sort: [{ 'state.started_at': 'desc' }],
        aggs: {
          errorStates: {
            terms: {
              field: 'state.id',
              size: 10000,
            },
            aggs: {
              summary: {
                top_hits: {
                  size: 1,
                  _source: ['error', 'state', 'monitor', '@timestamp'],
                  sort: [{ '@timestamp': 'desc' }],
                },
              },
            },
          },
        },
      },
    },
    [lastRefresh, monitorId, monitorIdArg, dateRangeStart, dateRangeEnd, selectedLocation?.label],
    {
      name: `getMonitorErrors/${dateRangeStart}/${dateRangeEnd}`,
      isRequestReady: Boolean(selectedLocation?.label),
    }
  );

  return useMemo(() => {
    const errorStates = data?.aggregations?.errorStates.buckets?.map((loc) => {
      return loc.summary.hits.hits?.[0]._source as PingState;
    });

    const hasActiveError: boolean =
      errorStates?.some((errorState) => isActiveState(errorState)) || false;

    return {
      errorStates,
      loading,
      data,
      hasActiveError,
    };
  }, [data, loading]);
}

export const isActiveState = (item: PingState) => {
  const timestamp = item['@timestamp'];
  const interval = moment(item.monitor.timespan?.lt).diff(
    moment(item.monitor.timespan?.gte),
    'milliseconds'
  );
  return moment().diff(moment(timestamp), 'milliseconds') < interval;
};
