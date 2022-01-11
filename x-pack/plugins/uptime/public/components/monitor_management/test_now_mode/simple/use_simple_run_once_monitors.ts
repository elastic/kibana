/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { selectDynamicSettings } from '../../../../state/selectors';
import { Ping } from '../../../../../common/runtime_types';
import { createEsParams, useEsSearch } from '../../../../../../observability/public';
import { useTickTick } from '../use_tick_tick';

export const useSimpleRunOnceMonitors = ({ monitorId }: { monitorId: string }) => {
  const { refreshTimer, lastRefresh } = useTickTick();

  const { settings } = useSelector(selectDynamicSettings);

  const { data, loading } = useEsSearch(
    createEsParams({
      index: settings?.heartbeatIndices,
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
                  config_id: monitorId,
                },
              },
              {
                exists: {
                  field: 'summary',
                },
              },
            ],
          },
        },
      },
      size: 10,
    }),
    [monitorId, settings?.heartbeatIndices, lastRefresh],
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
