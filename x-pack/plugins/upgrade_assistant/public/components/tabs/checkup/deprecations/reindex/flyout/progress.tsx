/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCallOut, EuiProgress, EuiText } from '@elastic/eui';

import { IndexGroup, ReindexStatus, ReindexStep } from '../../../../../../../common/types';
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
  indexGroup?: IndexGroup;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
}> = ({
  lastCompletedStep = -1,
  reindexStatus,
  indexGroup,
  reindexTaskPercComplete,
  errorMessage,
}) => {
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

  const steps = [
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
  ];

  // If this index is part of an index group, add the approriate group services steps.
  if (indexGroup === IndexGroup.ml) {
    steps.unshift({
      title: 'Pausing Machine Learning jobs',
      ...stepDetails(ReindexStep.indexGroupServicesStopped),
    });
    steps.push({
      title: 'Resuming Machine Learning jobs',
      ...stepDetails(ReindexStep.indexGroupServicesStarted),
    });
  } else if (indexGroup === IndexGroup.watcher) {
    steps.unshift({
      title: 'Stopping Watcher',
      ...stepDetails(ReindexStep.indexGroupServicesStopped),
    });
    steps.push({
      title: 'Resuming Watcher',
      ...stepDetails(ReindexStep.indexGroupServicesStarted),
    });
  }

  return <StepProgress steps={steps} />;
};
