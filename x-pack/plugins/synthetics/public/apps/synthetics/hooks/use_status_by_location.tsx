/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { Ping } from '../../../../common/runtime_types';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  SUMMARY_FILTER,
} from '../../../../common/constants/client_defaults';
import { SYNTHETICS_INDEX_PATTERN, UNNAMED_LOCATION } from '../../../../common/constants';
import { useSyntheticsRefreshContext } from '../contexts';

export function useStatusByLocation(monitorIdArg?: string) {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitorId } = useParams<{ monitorId: string }>();

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
                term: {
                  config_id: monitorIdArg ?? monitorId,
                },
              },
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
        aggs: {
          locations: {
            terms: {
              field: 'observer.geo.name',
              missing: UNNAMED_LOCATION,
              size: 1000,
            },
            aggs: {
              summary: {
                top_hits: {
                  size: 1,
                },
              },
            },
          },
        },
      },
    },
    [lastRefresh, monitorId, monitorIdArg],
    { name: 'getMonitorStatusByLocation' }
  );

  return useMemo(() => {
    const locations = (data?.aggregations?.locations.buckets ?? []).map((loc) => {
      return loc.summary.hits.hits?.[0]._source as Ping;
    });

    return {
      locations,
      loading,
    };
  }, [data, loading]);
}
