/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { selectDynamicSettings } from '../../../../state/selectors';
import { JourneyStep } from '../../../../../common/runtime_types';
import { createEsParams, useEsSearch, useFetcher } from '../../../../../../observability/public';
import { useTickTick } from '../use_tick_tick';
import { fetchJourneySteps } from '../../../../state/api/journey';
import { isStepEnd } from '../../../synthetics/check_steps/steps_list';

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
                  'synthetics.type': ['heartbeat/summary', 'journey/start'],
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

  const [checkGroupId, setCheckGroupId] = useState('');
  const [stepEnds, setStepEnds] = useState<JourneyStep[]>([]);
  const [summary, setSummary] = useState<JourneyStep>();

  const { data, loading } = useBrowserEsResults({ monitorId, lastRefresh });

  const { data: stepListData } = useFetcher(() => {
    if (checkGroupId) {
      return fetchJourneySteps({
        checkGroup: checkGroupId,
      });
    }
    return Promise.resolve(null);
  }, [lastRefresh]);

  useEffect(() => {
    const hits = data?.hits.hits;

    if (hits && hits.length > 0) {
      hits?.forEach((hit) => {
        const doc = hit._source as JourneyStep;
        if (doc.synthetics?.type === 'journey/start') {
          setCheckGroupId(doc.monitor.check_group);
        }
        if (doc.synthetics?.type === 'heartbeat/summary') {
          setSummary(doc);
          clearInterval(refreshTimer);
        }
      });
    }
  }, [data, refreshTimer]);

  useEffect(() => {
    if (stepListData?.steps && stepListData?.steps.length > 0) {
      setStepEnds(stepListData.steps.filter(isStepEnd));
    }
  }, [stepListData]);

  return {
    data,
    stepEnds,
    loading,
    stepListData,
    summaryDoc: summary,
    journeyStarted: Boolean(checkGroupId),
  };
};
