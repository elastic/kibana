/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { JourneyStep } from '../../../../../common/runtime_types';
import { createEsParams, useEsSearch, useFetcher } from '../../../../../../observability/public';
import { useTickTick } from '../use_tick_tick';
import { fetchJourneySteps } from '../../../../state/api/journey';
import { isStepEnd } from '../../../synthetics/check_steps/steps_list';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../common/constants';

export const useBrowserEsResults = ({
  configId,
  testRunId,
  lastRefresh,
}: {
  configId: string;
  testRunId?: string;
  lastRefresh: number;
}) => {
  return useEsSearch(
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
                terms: {
                  'synthetics.type': ['heartbeat/summary', 'journey/start'],
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
};

export const useBrowserRunOnceMonitors = ({
  configId,
  testRunId,
  skipDetails = false,
  refresh = true,
}: {
  configId: string;
  testRunId?: string;
  refresh?: boolean;
  skipDetails?: boolean;
}) => {
  const { refreshTimer, lastRefresh } = useTickTick(3 * 1000, refresh);

  const [checkGroupId, setCheckGroupId] = useState('');
  const [stepEnds, setStepEnds] = useState<JourneyStep[]>([]);
  const [summary, setSummary] = useState<JourneyStep>();

  const { data, loading } = useBrowserEsResults({ configId, testRunId, lastRefresh });

  const { data: stepListData, loading: stepsLoading } = useFetcher(() => {
    if (checkGroupId && !skipDetails) {
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
    stepsLoading,
    stepListData,
    summaryDoc: summary,
    journeyStarted: Boolean(checkGroupId),
  };
};
