/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useBrowserRunOnceMonitors } from '../hooks/use_browser_run_once_monitors';

interface Props {
  testRunId: string;
  expectPings: number;
  onDone: (testRunId: string) => void;
  onProgress: (message: string) => void;
}
export const BrowserTestRunResult = ({ expectPings, onDone, testRunId, onProgress }: Props) => {
  const { summariesLoading, expectedSummariesLoaded, stepLoadingInProgress, checkGroupResults } =
    useBrowserRunOnceMonitors({
      testRunId,
      expectSummaryDocs: expectPings,
    });

  useEffect(() => {
    if (expectedSummariesLoaded) {
      onDone(testRunId);
    }
  }, [onDone, expectedSummariesLoaded, testRunId]);

  return (
    <>
      {checkGroupResults.map((checkGroupResult) => {
        const { checkGroupId, journeyStarted, summaryDoc, stepsLoading, steps, completedSteps } =
          checkGroupResult;
        const isStepsLoading = !summariesLoading && journeyStarted && summaryDoc && stepsLoading;
        const isStepsLoadingFailed =
          summaryDoc && !summariesLoading && !stepLoadingInProgress && steps.length === 0;

        if (completedSteps > 0) {
          onProgress(
            i18n.translate('xpack.synthetics.monitorManagement.stepCompleted', {
              defaultMessage:
                '{stepCount, number} {stepCount, plural, one {step} other {steps}}  completed',
              values: {
                stepCount: completedSteps ?? 0,
              },
            })
          );
        }

        if (isStepsLoading) {
          onProgress(LOADING_STEPS);
        }

        if (isStepsLoadingFailed) {
          // TODO: Add error toast
          onProgress(summaryDoc?.error?.message ?? FAILED_TO_RUN);
          // <EuiText color="danger">{summaryDoc?.error?.message ?? FAILED_TO_RUN}</EuiText>
        }
        if (
          isStepsLoadingFailed &&
          summaryDoc?.error?.message?.includes('journey did not finish executing')
        ) {
          // TODO: Add error toast
          // <StdErrorLogs checkGroup={summaryDoc.monitor.check_group} hideTitle={true} />;
        }

        return <Fragment key={'accordion-' + checkGroupId} />;
      })}
    </>
  );
};

const FAILED_TO_RUN = i18n.translate('xpack.synthetics.monitorManagement.failedRun', {
  defaultMessage: 'Failed to run steps',
});

const LOADING_STEPS = i18n.translate('xpack.synthetics.monitorManagement.loadingSteps', {
  defaultMessage: 'Loading steps...',
});
