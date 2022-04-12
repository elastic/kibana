/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useRef } from 'react';
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

  const lastUpdated = useRef<{ checksum: string; time: number }>({
    checksum: '',
    time: Date.now(),
  });

  return useMemo(() => {
    const docs = data?.hits.hits ?? [];

    // Whenever a new found document is fetched, update lastUpdated
    const docsChecksum = docs
      .map(({ _id }: { _id: string }) => _id)
      .reduce((acc, cur) => acc + cur, '');
    if (docsChecksum !== lastUpdated.current.checksum) {
      // Mutating lastUpdated
      lastUpdated.current.checksum = docsChecksum;
      lastUpdated.current.time = Date.now();
    }

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
        lastUpdated: lastUpdated.current.time,
      };
    }

    return {
      data,
      loading,
      summaryDocs: null,
      lastUpdated: lastUpdated.current.time,
    };
  }, [expectSummaryDocs, data, loading, refreshTimer]);
};
