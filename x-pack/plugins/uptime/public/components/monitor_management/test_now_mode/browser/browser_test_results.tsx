/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import * as React from 'react';
import { EuiAccordion, EuiText, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { StepsList } from '../../../synthetics/check_steps/steps_list';
import { CheckGroupResult, useBrowserRunOnceMonitors } from './use_browser_run_once_monitors';
import { TestResultHeader } from '../test_result_header';
import { StdErrorLogs } from '../../../synthetics/check_steps/stderr_logs';

interface Props {
  monitorId: string;
  isMonitorSaved: boolean;
  expectPings: number;
  onDone: () => void;
}
export const BrowserTestRunResult = ({ monitorId, isMonitorSaved, expectPings, onDone }: Props) => {
  const { summariesLoading, expectedSummariesLoaded, stepLoadingInProgress, checkGroupResults } =
    useBrowserRunOnceMonitors({
      configId: monitorId,
      expectSummaryDocs: expectPings,
    });

  useEffect(() => {
    if (expectedSummariesLoaded) {
      onDone();
    }
  }, [onDone, expectedSummariesLoaded]);

  return (
    <>
      {checkGroupResults.map((checkGroupResult) => {
        const { checkGroupId, journeyStarted, summaryDoc, stepsLoading, steps, completedSteps } =
          checkGroupResult;
        const isStepsLoading = !summariesLoading && journeyStarted && summaryDoc && stepsLoading;
        const isStepsLoadingFailed =
          summaryDoc && !summariesLoading && !stepLoadingInProgress && steps.length === 0;

        return (
          <AccordionWrapper
            key={'accordion-' + checkGroupId}
            id={'accordion-' + checkGroupId}
            element="fieldset"
            className="euiAccordionForm"
            buttonClassName="euiAccordionForm__button"
            buttonContent={getButtonContent(checkGroupResult)}
            paddingSize="s"
            data-test-subj="expandResults"
            initialIsOpen={checkGroupResults.length === 1}
          >
            {isStepsLoading && (
              <EuiFlexGroup alignItems="center" gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiText>{LOADING_STEPS}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
            {isStepsLoadingFailed && (
              <EuiText color="danger">{summaryDoc?.error?.message ?? FAILED_TO_RUN}</EuiText>
            )}

            {isStepsLoadingFailed &&
              summaryDoc?.error?.message?.includes('journey did not finish executing') && (
                <StdErrorLogs checkGroup={summaryDoc.monitor.check_group} hideTitle={true} />
              )}

            {completedSteps > 0 && (
              <StepsList
                data={steps}
                compactView={true}
                showStepDurationTrend={isMonitorSaved}
                loading={Boolean(stepLoadingInProgress)}
                error={undefined}
              />
            )}
          </AccordionWrapper>
        );
      })}
    </>
  );
};

const AccordionWrapper = styled(EuiAccordion)`
  .euiAccordion__buttonContent {
    width: 100%;
  }
`;

function getButtonContent({
  journeyDoc,
  summaryDoc,
  checkGroupId,
  journeyStarted,
  completedSteps,
}: CheckGroupResult) {
  return (
    <div>
      <TestResultHeader
        title={journeyDoc?.observer?.geo?.name}
        summaryDocs={summaryDoc ? [summaryDoc] : []}
        checkGroupId={checkGroupId}
        journeyStarted={journeyStarted}
        isCompleted={Boolean(summaryDoc)}
      />
      <EuiText size="s">
        <p>
          <EuiText color="subdued">
            {i18n.translate('xpack.uptime.monitorManagement.stepCompleted', {
              defaultMessage:
                '{stepCount, number} {stepCount, plural, one {step} other {steps}}  completed',
              values: {
                stepCount: completedSteps ?? 0,
              },
            })}
          </EuiText>
        </p>
      </EuiText>
    </div>
  );
}

const FAILED_TO_RUN = i18n.translate('xpack.uptime.monitorManagement.failedRun', {
  defaultMessage: 'Failed to run steps',
});

const LOADING_STEPS = i18n.translate('xpack.uptime.monitorManagement.loadingSteps', {
  defaultMessage: 'Loading steps...',
});
