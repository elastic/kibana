/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { useKibanaSpace } from '../../../../../hooks/use_kibana_space';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';
import { useGetUrlParams } from '../../../hooks';
import { selectEncryptedSyntheticsSavedMonitors } from '../../../state';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  getRangeFilter,
} from '../../../../../../common/constants/client_defaults';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

export const useErrorFilters = (spaceId?: string) => {
  const { locations, monitorTypes, tags, query, projects } = useGetUrlParams();

  const filters: QueryDslQueryContainer[] = [
    {
      exists: {
        field: 'summary',
      },
    },
    {
      term: {
        'meta.space_id': spaceId,
      },
    },
    {
      exists: {
        field: 'error',
      },
    },
    EXCLUDE_RUN_ONCE_FILTER,
    getRangeFilter({
      from: 'now-6h',
      to: 'now',
    }),

    ...(projects && projects.length > 0 ? [{ terms: { 'monitor.project.id': projects } }] : []),
    ...(monitorTypes && monitorTypes.length > 0
      ? [{ terms: { 'monitor.type': monitorTypes } }]
      : []),
    ...(tags && tags.length > 0 ? [{ terms: { tags } }] : []),
    ...(locations && locations.length > 0 ? [{ terms: { 'observer.geo.name': locations } }] : []),
    ...(query
      ? [
          {
            query_string: {
              query: `${query}*`,
              fields: [
                'monitor.name',
                'tags',
                'observer.geo.name',
                'observer.name',
                'urls',
                'hosts',
                'monitor.project.id',
              ],
            },
          },
        ]
      : []),
  ];

  return filters;
};

export function useErrorsHistogram() {
  const syntheticsMonitors = useSelector(selectEncryptedSyntheticsSavedMonitors);

  const { lastRefresh } = useSyntheticsRefreshContext();
  const { space } = useKibanaSpace();

  const filters = useErrorFilters(space?.id);

  const { data, loading } = useReduxEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        size: 0,
        query: {
          bool: {
            filter: filters,
          },
        },
        sort: {
          '@timestamp': {
            order: 'desc',
          },
        },
        aggs: {
          errorsHistogram: {
            date_histogram: {
              field: '@timestamp',
              min_doc_count: 0,
              fixed_interval: '30m',
              extended_bounds: {
                min: 'now-24h',
                max: 'now',
              },
            },
            aggs: {
              errors: {
                cardinality: {
                  field: 'state.id',
                },
              },
            },
          },
          totalErrors: {
            cardinality: {
              field: 'state.id',
            },
          },
        },
      },
    },
    [syntheticsMonitors, lastRefresh, JSON.stringify(filters)],
    { name: 'getMonitorErrors', isRequestReady: !!space?.id }
  );

  return useMemo(() => {
    const histogram =
      data?.aggregations?.errorsHistogram.buckets.map((bucket) => {
        const count = bucket.errors.value;
        return {
          x: bucket.key,
          y: count,
        };
      }) ?? [];

    const totalErrors = data?.aggregations?.totalErrors.value ?? 0;

    return { histogram, totalErrors, loading };
  }, [
    data?.aggregations?.errorsHistogram?.buckets,
    data?.aggregations?.totalErrors?.value,
    loading,
  ]);
}
