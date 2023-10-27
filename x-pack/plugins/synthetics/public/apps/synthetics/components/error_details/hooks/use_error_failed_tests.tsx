/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';
import { Ping } from '../../../../../../common/runtime_types';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
} from '../../../../../../common/constants/client_defaults';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useSyntheticsRefreshContext } from '../../../contexts';
import { useGetUrlParams } from '../../../hooks';

export function useErrorFailedTests() {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { errorStateId, monitorId } = useParams<{ errorStateId: string; monitorId: string }>();

  const { dateRangeStart, dateRangeEnd } = useGetUrlParams();

  const { data, loading } = useReduxEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        size: 10000,
        query: {
          bool: {
            filter: [
              SUMMARY_FILTER,
              EXCLUDE_RUN_ONCE_FILTER,
              {
                term: {
                  'state.id': errorStateId,
                },
              },
              {
                term: {
                  config_id: monitorId,
                },
              },
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
      },
    },
    [lastRefresh, monitorId, dateRangeStart, dateRangeEnd],
    { name: 'getMonitorErrorFailedTests' }
  );

  return useMemo(() => {
    const failedTests =
      data?.hits.hits?.map((doc) => {
        const source = doc._source as any;
        return { ...source, timestamp: source['@timestamp'] } as Ping;
      }) ?? [];

    return {
      failedTests,
      loading,
    };
  }, [data, loading]);
}
