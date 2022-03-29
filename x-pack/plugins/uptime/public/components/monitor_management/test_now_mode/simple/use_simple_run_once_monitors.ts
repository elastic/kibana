/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { createEsParams, useEsSearch } from '@kbn/observability-plugin/public';
import { Ping } from '../../../../../common/runtime_types';
import { useTickTick } from '../use_tick_tick';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../common/constants';

export const useSimpleRunOnceMonitors = ({
  configId,
  expectSummaryDocs,
  testRunId,
}: {
  configId: string;
  expectSummaryDocs: number;
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
    const docs = data?.hits.hits ?? [];

    if (docs.length > 0) {
      if (docs.length >= expectSummaryDocs) {
        clearInterval(refreshTimer);
      }

      return {
        data,
        loading,
        summaryDocs: docs.map((doc) => ({
          ...(doc._source as Ping),
          timestamp: (doc._source as Record<string, string>)?.['@timestamp'],
          docId: doc._id,
        })),
      };
    }

    return {
      data,
      loading,
      summaryDocs: null,
    };
  }, [expectSummaryDocs, data, loading, refreshTimer]);
};
