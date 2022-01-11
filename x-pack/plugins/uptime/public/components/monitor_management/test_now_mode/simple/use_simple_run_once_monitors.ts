/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useEffect, Dispatch, SetStateAction, useState, useContext } from 'react';
import { UptimeRefreshContext } from '../../../../contexts';
import { selectDynamicSettings } from '../../../../state/selectors';
import { Ping } from '../../../../../common/runtime_types';
import { createEsParams, useEsSearch } from '../../../../../../observability/public';

export const useSimpleRunOnceMonitors = ({
  monitorId,
  refresh,
  setRefresh,
}: {
  monitorId: string;
  refresh: number;
  setRefresh: Dispatch<SetStateAction<number>>;
}) => {
  const [summaryDoc, setSummaryDoc] = useState<Ping | null>(null);
  const [tickTick, setTickTick] = useState<NodeJS.Timer | null>(null);

  const { refreshApp } = useContext(UptimeRefreshContext);

  const { settings } = useSelector(selectDynamicSettings);
  useEffect(() => {
    if (summaryDoc && tickTick) {
      clearInterval(tickTick);
    }
    if (!tickTick) {
      setTickTick(
        setInterval(() => {
          setRefresh(Date.now());
          refreshApp();
        }, 5 * 1000)
      );
    }

    return () => {
      if (tickTick) clearInterval(tickTick);
    };
    // eslint-ignore-next-line react-hooks/exhaustive-deps
  }, [setRefresh, summaryDoc]);

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
    [monitorId, settings?.heartbeatIndices, refresh],
    { name: 'TestRunData' }
  );

  useEffect(() => {
    const doc = data?.hits.hits?.[0];
    setSummaryDoc(
      doc
        ? {
            ...(doc?._source as Ping),
            timestamp: (doc?._source as Record<string, string>)?.['@timestamp'],
            docId: doc?._id,
          }
        : null
    );
  }, [data]);

  return {
    data,
    loading,
    summaryDoc,
  };
};
