/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { Ping } from '../../../../../../common/runtime_types';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
} from '../../../../../../common/constants/client_defaults';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { useGetUrlParams } from '../../../hooks';

export function useMonitorErrors(monitorIdArg?: string) {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitorId } = useParams<{ monitorId: string }>();

  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const { data, loading } = useEsSearch(
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
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
        aggs: {
          errorStates: {
            terms: {
              field: 'state.id',
              size: 1000,
            },
            aggs: {
              summary: {
                top_hits: {
                  size: 1,
                  _source: ['error', 'state', 'monitor'],
                  sort: [{ '@timestamp': 'desc' }],
                },
              },
            },
          },
        },
      },
    },
    [lastRefresh, monitorId, monitorIdArg, dateRangeStart, dateRangeEnd],
    { name: 'getMonitorErrors' }
  );

  return useMemo(() => {
    const errorStates = (data?.aggregations?.errorStates.buckets ?? []).map((loc) => {
      return loc.summary.hits.hits?.[0]._source as Ping;
    });

    return {
      errorStates,
      loading,
    };
  }, [data, loading]);
}
