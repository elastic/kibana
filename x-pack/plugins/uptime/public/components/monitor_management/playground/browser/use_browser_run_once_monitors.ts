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
import { JourneyStep } from '../../../../../common/runtime_types';
import { createEsParams, useEsSearch } from '../../../../../../observability/public';

export const useBrowserRunOnceMonitors = ({
  monitorId,
  refresh,
  setRefresh,
}: {
  monitorId: string;
  refresh: number;
  setRefresh: Dispatch<SetStateAction<number>>;
}) => {
  const [summaryDoc, setSummaryDoc] = useState<JourneyStep | null>(null);
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
                terms: {
                  'synthetics.type': ['heartbeat/summary', 'journey/start', 'step/end'],
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

  const hits = data?.hits.hits;

  let journeyStarted = false;
  let summaryDocument: JourneyStep | null = null;

  const stepEnds: JourneyStep[] = [];
  if (hits && hits.length > 0) {
    hits?.forEach((hit) => {
      const doc = hit._source as JourneyStep;
      if (doc.synthetics?.type === 'journey/start') {
        journeyStarted = true;
      }
      if (doc.synthetics?.type === 'heartbeat/summary' && !summaryDoc) {
        summaryDocument = doc;
        setSummaryDoc(doc);
      }
      if (doc.synthetics?.type === 'step/end') {
        stepEnds.push(doc);
      }
    });
  }
  return {
    data,
    loading,
    journeyStarted,
    summaryDoc: summaryDocument || summaryDoc,
    stepEnds: stepEnds.sort((stepA, stepB) => stepA.synthetics.index! - stepB.synthetics.index!),
  };
};
