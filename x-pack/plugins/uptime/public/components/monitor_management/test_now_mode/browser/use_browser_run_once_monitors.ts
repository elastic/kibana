/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { selectDynamicSettings } from '../../../../state/selectors';
import { JourneyStep } from '../../../../../common/runtime_types';
import { createEsParams, useEsSearch } from '../../../../../../observability/public';
import { useTickTick } from '../use_tick_tick';

export const useBrowserEsResults = ({
  monitorId,
  lastRefresh,
}: {
  monitorId: string;
  lastRefresh: number;
}) => {
  const { settings } = useSelector(selectDynamicSettings);

  return useEsSearch(
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
    [monitorId, settings?.heartbeatIndices, lastRefresh],
    { name: 'TestRunData' }
  );
};

export const useBrowserRunOnceMonitors = ({ monitorId }: { monitorId: string }) => {
  const { refreshTimer, lastRefresh } = useTickTick();

  const { data, loading } = useBrowserEsResults({ monitorId, lastRefresh });

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
      if (doc.synthetics?.type === 'heartbeat/summary') {
        summaryDocument = doc;
        clearInterval(refreshTimer);
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
    summaryDoc: summaryDocument,
    stepEnds: stepEnds.sort((stepA, stepB) => stepA.synthetics.index! - stepB.synthetics.index!),
  };
};
