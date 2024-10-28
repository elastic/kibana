/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { useEsSearch } from '@kbn/observability-shared-plugin/public';
import { selectEncryptedSyntheticsSavedMonitors } from '../../../state';
import {
  EXCLUDE_RUN_ONCE_FILTER,
  getRangeFilter,
} from '../../../../../../common/constants/client_defaults';
import { useSyntheticsRefreshContext } from '../../../contexts/synthetics_refresh_context';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

export const getErrorFilters = () => [
  {
    exists: {
      field: 'summary',
    },
  },
  {
    exists: {
      field: 'error',
    },
  },
  EXCLUDE_RUN_ONCE_FILTER,
  getRangeFilter({
    from: 'now-24h',
    to: 'now',
  }),
];

export function useErrorsHistogram() {
  const syntheticsMonitors = useSelector(selectEncryptedSyntheticsSavedMonitors);

  const { lastRefresh } = useSyntheticsRefreshContext();

  const { data } = useEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        size: 0,
        query: {
          bool: {
            filter: getErrorFilters(),
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
              fixed_interval: '1h',
              extended_bounds: {
                min: 'now-24h',
                max: 'now',
              },
            },
          },
        },
      },
    },
    [syntheticsMonitors, lastRefresh],
    { name: 'getMonitorErrors' }
  );

  return useMemo(() => {
    const histogram =
      data?.aggregations?.errorsHistogram.buckets.map((bucket) => ({
        x: bucket.key,
        y: bucket.doc_count,
      })) ?? [];

    const totalErrors = histogram.reduce((acc, { y }) => acc + y, 0);

    return { histogram, totalErrors };
  }, [data]);
}
