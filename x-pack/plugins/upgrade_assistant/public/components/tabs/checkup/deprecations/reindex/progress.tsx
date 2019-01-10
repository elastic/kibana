/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCallOut, EuiContainedStepProps, EuiProgress, EuiSteps, EuiText } from '@elastic/eui';
import { ReindexStatus, ReindexStep } from '../../../../../../common/types';

const ErrorCallout: React.StatelessComponent<{ errorMessage: string | null }> = ({
  errorMessage,
}) => (
  <EuiCallOut color="danger" title="There was an error">
    <EuiText>
      <p>{errorMessage}</p>
    </EuiText>
  </EuiCallOut>
);

/**
 * Displays a list of reindexing steps and their current status. Will also display any errors that
 * are encountered during the reindex process and which step caused the error.
 */
export const ReindexProgress: React.StatelessComponent<{
  lastCompletedStep?: ReindexStep;
  reindexStatus?: ReindexStatus;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
}> = ({ lastCompletedStep = -1, reindexStatus, reindexTaskPercComplete, errorMessage }) => {
  // Generic step details
  const stepDetails = (
    thisStep: ReindexStep
  ): Pick<EuiContainedStepProps, 'status' | 'children'> => {
    if (reindexStatus === ReindexStatus.failed && lastCompletedStep + 1 === thisStep) {
      return {
        status: 'danger',
        children: <ErrorCallout {...{ errorMessage }} />,
      };
    }

    return {
      status:
        reindexStatus !== undefined && lastCompletedStep >= thisStep ? 'complete' : 'incomplete',
      children: <span />,
    };
  };

  // Reindex step is special because it encompasses 2 steps (started and completed) and
  // displays a progress bar.
  const reindexProgressBar =
    lastCompletedStep < ReindexStep.newIndexCreated ? (
      <span />
    ) : reindexTaskPercComplete ? (
      <EuiProgress size="s" value={reindexTaskPercComplete} max={1} />
    ) : (
      <EuiProgress size="s" />
    );

  const reindexingDocsStep = { title: 'Reindexing documents' } as EuiContainedStepProps;

  if (
    reindexStatus === ReindexStatus.failed &&
    (lastCompletedStep === ReindexStep.newIndexCreated ||
      lastCompletedStep === ReindexStep.reindexStarted)
  ) {
    reindexingDocsStep.status = 'danger';
    reindexingDocsStep.children = <ErrorCallout {...{ errorMessage }} />;
  } else {
    reindexingDocsStep.status =
      reindexStatus !== undefined && lastCompletedStep >= ReindexStep.reindexCompleted
        ? 'complete'
        : 'incomplete';
    reindexingDocsStep.children = reindexStatus !== undefined ? reindexProgressBar : <span />;
  }

  return (
    <EuiSteps
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
          title: 'Creating alias',
          ...stepDetails(ReindexStep.aliasCreated),
        },
      ]}
    />
  );
};
