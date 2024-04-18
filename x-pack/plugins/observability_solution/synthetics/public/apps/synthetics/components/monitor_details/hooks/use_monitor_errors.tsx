/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useTimeZone } from '@kbn/observability-shared-plugin/public';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useSelectedLocation } from './use_selected_location';
import { Ping, PingState } from '../../../../../../common/runtime_types';
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
          states: {
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
          latest: {
            top_hits: {
              size: 1,
              _source: ['monitor.status'],
              sort: [{ '@timestamp': 'desc' }],
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
    const defaultValues = { upStates: [], errorStates: [] };
    // re-bucket states into error/up
    // including the `up` states is useful for determining error duration
    const { errorStates, upStates } =
      data?.aggregations?.states.buckets.reduce<{
        upStates: PingState[];
        errorStates: PingState[];
      }>((prev, cur) => {
        const source = cur.summary.hits.hits?.[0]._source as PingState | undefined;
        if (source?.state.up === 0) {
          prev.errorStates.push(source as PingState);
        } else if (!!source?.state.up && source.state.up >= 1) {
          prev.upStates.push(source as PingState);
        }
        return prev;
      }, defaultValues) ?? defaultValues;

    const hits = data?.aggregations?.latest.hits.hits ?? [];

    const hasActiveError: boolean =
      hits.length === 1 &&
      (hits[0]?._source as Ping).monitor?.status === 'down' &&
      !!errorStates?.length;

    const upStatesSortedAsc = upStates.sort(
      (a, b) => Number(new Date(a.state.started_at)) - Number(new Date(b.state.started_at))
    );

    return {
      errorStates,
      upStates: upStatesSortedAsc,
      loading,
      data,
      hasActiveError,
    };
  }, [data, loading]);
}
