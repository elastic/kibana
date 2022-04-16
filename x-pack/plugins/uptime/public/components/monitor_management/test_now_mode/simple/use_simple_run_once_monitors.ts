/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { Ping } from '../../../../../common/runtime_types';
import { createEsParams, useEsSearch } from '../../../../../../observability/public';
import { useTickTick } from '../use_tick_tick';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../common/constants';

export const useSimpleRunOnceMonitors = ({
  configId,
  testRunId,
}: {
  configId: string;
  testRunId?: string;
}) => {
  const { refreshTimer, lastRefresh } = useTickTick(2 * 1000, false);

  const { data, loading } = useEsSearch(
    createEsParams({
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        sort: [
          {
            '@timestamp': 'desc',
          },
        ],
        query: {
          bool: {
            filter: [
              {
                term: {
                  config_id: configId,
                },
              },
              {
                exists: {
                  field: 'summary',
                },
              },
              ...(testRunId
                ? [
                    {
                      term: {
                        test_run_id: testRunId,
                      },
                    },
                  ]
                : []),
            ],
          },
        },
      },
      size: 1000,
    }),
    [configId, lastRefresh],
    { name: 'TestRunData' }
  );

  return useMemo(() => {
    const doc = data?.hits.hits?.[0];

    if (doc) {
      clearInterval(refreshTimer);
      return {
        data,
        loading,
        summaryDoc: {
          ...(doc._source as Ping),
          timestamp: (doc._source as Record<string, string>)?.['@timestamp'],
          docId: doc._id,
        },
      };
    }

    return {
      data,
      loading,
      summaryDoc: null,
    };
  }, [data, loading, refreshTimer]);
};
