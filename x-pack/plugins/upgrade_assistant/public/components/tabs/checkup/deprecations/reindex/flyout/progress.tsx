/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCallOut, EuiProgress, EuiText } from '@elastic/eui';

import { ReindexStatus, ReindexStep } from '../../../../../../../common/types';
import { StepProgress, StepProgressStep } from './step_progress';

const ErrorCallout: React.StatelessComponent<{ errorMessage: string | null }> = ({
  errorMessage,
}) => (
  <EuiCallOut color="danger" title="There was an error">
    <EuiText>
      <p>{errorMessage}</p>
    </EuiText>
  </EuiCallOut>
);

const PausedCallout = () => (
  <EuiCallOut
    color="warning"
    title="This step was paused due to a Kibana restart. Click 'Resume' below to continue."
  />
);

const orderedSteps = Object.values(ReindexStep).sort() as number[];

/**
 * Displays a list of steps in the reindex operation, the current status, a progress bar,
 * and any error messages that are encountered.
 */
export const ReindexProgress: React.StatelessComponent<{
  lastCompletedStep?: ReindexStep;
  reindexStatus?: ReindexStatus;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
}> = ({ lastCompletedStep = -1, reindexStatus, reindexTaskPercComplete, errorMessage }) => {
  const stepDetails = (thisStep: ReindexStep): Pick<StepProgressStep, 'status' | 'children'> => {
    const previousStep = orderedSteps[orderedSteps.indexOf(thisStep) - 1];

    if (reindexStatus === ReindexStatus.failed && lastCompletedStep === previousStep) {
      return {
        status: 'failed',
        children: <ErrorCallout {...{ errorMessage }} />,
      };
    } else if (reindexStatus === ReindexStatus.paused && lastCompletedStep === previousStep) {
      return {
        status: 'paused',
        children: <PausedCallout />,
      };
    } else if (reindexStatus === undefined || lastCompletedStep < previousStep) {
      return {
        status: 'incomplete',
      };
    } else if (lastCompletedStep === previousStep) {
      return {
        status: 'inProgress',
      };
    } else {
      return {
        status: 'complete',
      };
    }
  };

  // The reindexing step is special because it combines the starting and complete statuses into a single UI
  // with a progress bar.
  const reindexingDocsStep = { title: 'Reindexing documents' } as StepProgressStep;
  if (
    reindexStatus === ReindexStatus.failed &&
    (lastCompletedStep === ReindexStep.newIndexCreated ||
      lastCompletedStep === ReindexStep.reindexStarted)
  ) {
    reindexingDocsStep.status = 'failed';
    reindexingDocsStep.children = <ErrorCallout {...{ errorMessage }} />;
  } else if (
    reindexStatus === ReindexStatus.paused &&
    (lastCompletedStep === ReindexStep.newIndexCreated ||
      lastCompletedStep === ReindexStep.reindexStarted)
  ) {
    reindexingDocsStep.status = 'paused';
    reindexingDocsStep.children = <PausedCallout />;
  } else if (reindexStatus === undefined || lastCompletedStep < ReindexStep.newIndexCreated) {
    reindexingDocsStep.status = 'incomplete';
  } else {
    reindexingDocsStep.status =
      lastCompletedStep === ReindexStep.newIndexCreated ||
      lastCompletedStep === ReindexStep.reindexStarted
        ? 'inProgress'
        : 'complete';

    reindexingDocsStep.children = reindexTaskPercComplete ? (
      <EuiProgress size="s" value={reindexTaskPercComplete} max={1} />
    ) : (
      <EuiProgress size="s" />
    );
  }

  return (
    <StepProgress
      steps={[
        {
          title: 'Setting old index to read-only',
          ...stepDetails(ReindexStep.readonly),
        },
        {
          title: 'Creating new index',
          ...stepDetails(ReindexStep.newIndexCreated),
        },
        reindexingDocsStep,
        {
          title: 'Swapping original index with alias',
          ...stepDetails(ReindexStep.aliasCreated),
        },
      ]}
    />
  );
};
