/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { createEsParams, useEsSearch, useFetcher } from '@kbn/observability-plugin/public';
import { JourneyStep } from '../../../../../common/runtime_types';
import { useTickTick } from '../use_tick_tick';
import { fetchJourneySteps } from '../../../../state/api/journey';
import { isStepEnd } from '../../../synthetics/check_steps/steps_list';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../common/constants';

export interface CheckGroupResult {
  checkGroupId: string;
  journeyStarted: boolean;
  journeyDoc?: JourneyStep;
  summaryDoc?: JourneyStep;
  steps: JourneyStep[];
  stepsLoading: boolean;
  completedSteps: number;
}

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
  expectSummaryDocs,
}: {
  configId: string;
  testRunId?: string;
  refresh?: boolean;
  skipDetails?: boolean;
  expectSummaryDocs: number;
}) => {
  const { refreshTimer, lastRefresh } = useTickTick(3 * 1000, refresh);

  const [checkGroupResults, setCheckGroupResults] = useState<CheckGroupResult[]>(() => {
    return new Array(expectSummaryDocs)
      .fill({
        checkGroupId: '',
        journeyStarted: false,
        steps: [],
        stepsLoading: false,
        completedSteps: 0,
      } as CheckGroupResult)
      .map((emptyCheckGroup, index) => ({
        ...emptyCheckGroup,
        checkGroupId: `placeholder-check-group-${index}`,
      }));
  });

  const { data, loading: summariesLoading } = useBrowserEsResults({
    configId,
    testRunId,
    lastRefresh,
  });

  useEffect(() => {
    const hits = data?.hits.hits;

    if (hits && hits.length > 0) {
      const allDocs = (hits ?? []).map(({ _source }) => _source as JourneyStep);
      const checkGroupsById = allDocs
        .filter(
          (doc) =>
            doc.synthetics?.type === 'journey/start' || doc.synthetics?.type === 'heartbeat/summary'
        )
        .reduce(
          (acc, cur) => ({
            ...acc,
            [cur.monitor.check_group]: {
              checkGroupId: cur.monitor.check_group,
              journeyStarted: true,
              journeyDoc: cur,
              summaryDoc: null,
              steps: [],
              stepsLoading: false,
              completedSteps: 0,
            },
          }),
          {}
        ) as Record<string, CheckGroupResult>;

      allDocs.forEach((step) => {
        if (step.synthetics?.type === 'heartbeat/summary') {
          checkGroupsById[step.monitor.check_group].summaryDoc = step;
        }
      });

      const checkGroups = Object.values(checkGroupsById);
      const finishedCheckGroups = checkGroups.filter((group) => !!group.summaryDoc);

      if (finishedCheckGroups.length >= expectSummaryDocs) {
        clearInterval(refreshTimer);
      }

      replaceCheckGroupResults(checkGroups);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectSummaryDocs, data, refreshTimer]);

  // Loading steps for browser runs
  const checkGroupIds = checkGroupResults.map(({ checkGroupId }) => checkGroupId);
  const checkGroupCheckSum = checkGroupIds.reduce((acc, cur) => acc + cur, '');
  const { loading: stepLoadingInProgress } = useFetcher(() => {
    if (checkGroupIds.length && !skipDetails) {
      setCheckGroupResults((prevState) => {
        return prevState.map((result) => ({ ...result, stepsLoading: true }));
      });

      return Promise.all(
        checkGroupIds.map((id) => {
          return fetchJourneySteps({
            checkGroup: id,
          })
            .then((stepsData) => {
              updateCheckGroupResult(stepsData.checkGroup, {
                steps: stepsData.steps,
                completedSteps: stepsData.steps.filter(isStepEnd).length,
              });

              return stepsData;
            })
            .finally(() => {
              updateCheckGroupResult(id, {
                stepsLoading: false,
              });
            });
        })
      );
    }

    return Promise.resolve(null);
  }, [checkGroupCheckSum, setCheckGroupResults, lastRefresh]);

  const updateCheckGroupResult = (id: string, result: Partial<CheckGroupResult>) => {
    setCheckGroupResults((prevState) => {
      return prevState.map((r) => {
        if (id !== r.checkGroupId) {
          return r;
        }

        return mergeCheckGroups(r, result);
      }) as CheckGroupResult[];
    });
  };

  const replaceCheckGroupResults = (curCheckGroups: CheckGroupResult[]) => {
    const emptyCheckGroups = checkGroupResults.filter((group) =>
      group.checkGroupId.startsWith('placeholder-check-group')
    );

    // Padding the collection with placeholders so that rows could be shown on UI with loading state
    const paddedCheckGroups =
      curCheckGroups.length < expectSummaryDocs
        ? [
            ...curCheckGroups,
            ...emptyCheckGroups.slice(-1 * (expectSummaryDocs - curCheckGroups.length)),
          ]
        : curCheckGroups;

    setCheckGroupResults((prevCheckGroups) => {
      const newIds = paddedCheckGroups.map(({ checkGroupId }) => checkGroupId);
      const newById: Record<string, CheckGroupResult> = paddedCheckGroups.reduce(
        (acc, cur) => ({ ...acc, [cur.checkGroupId]: cur }),
        {}
      );
      const oldById: Record<string, CheckGroupResult> = prevCheckGroups.reduce(
        (acc, cur) => ({ ...acc, [cur.checkGroupId]: cur }),
        {}
      );

      return newIds.map((id) => mergeCheckGroups(oldById[id], newById[id]));
    });
  };

  return {
    summariesLoading,
    stepLoadingInProgress,
    checkGroupResults,
  };
};

function mergeCheckGroups(prev: CheckGroupResult, curr: Partial<CheckGroupResult>) {
  // Once completed steps has been determined and shown, don't lower the number on UI due to re-fetch
  const completedSteps = curr.completedSteps
    ? Math.max(prev?.completedSteps ?? 0, curr.completedSteps ?? 0)
    : prev?.completedSteps ?? 0;

  return {
    ...(prev ?? {}),
    ...curr,
    completedSteps,
  };
}
