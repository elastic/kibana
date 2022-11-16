/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-plugin/public';
import { useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { STEP_END_FILTER } from '../../../../../../common/constants/data_filters';
import { asMutableArray } from '../../../../../../common/utils/as_mutable_array';
import { Ping } from '../../../../../../common/runtime_types';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useSyntheticsRefreshContext } from '../../../contexts';

export function useErrorFailedStep(checkGroups: string[]) {
  const { lastRefresh } = useSyntheticsRefreshContext();

  const { monitorId } = useParams<{ monitorId: string }>();

  const { data, loading } = useEsSearch(
    {
      index: checkGroups?.length > 0 ? SYNTHETICS_INDEX_PATTERN : '',
      body: {
        size: checkGroups.length,
        query: {
          bool: {
            filter: [
              STEP_END_FILTER,
              {
                exists: {
                  field: 'synthetics.error',
                },
              },
              {
                terms: {
                  'monitor.check_group': checkGroups,
                },
              },
            ] as QueryDslQueryContainer[],
          },
        },
        sort: asMutableArray([
          { 'synthetics.step.index': { order: 'asc' } },
          { '@timestamp': { order: 'asc' } },
        ] as const),
        _source: ['synthetics.step', 'synthetics.error', 'monitor.check_group'],
      },
    },
    [lastRefresh, monitorId, checkGroups],
    { name: 'getMonitorErrorFailedStep' }
  );

  return useMemo(() => {
    const failedSteps = (data?.hits.hits ?? []).map((doc) => {
      return doc._source as Ping;
    });

    return {
      failedSteps,
      loading,
    };
  }, [data, loading]);
}
