/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { IndexGroup, ReindexStatus, ReindexStep } from '../../../../../../../../common/types';
import { LoadingState } from '../../../../../types';
import { ReindexState } from '../polling_service';
import { StepProgress, StepProgressStep } from './step_progress';

const ErrorCallout: React.FunctionComponent<{ errorMessage: string | null }> = ({
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

const ReindexProgressBar: React.FunctionComponent<{
  reindexState: ReindexState;
  cancelReindex: () => void;
}> = ({
  reindexState: { lastCompletedStep, status, reindexTaskPercComplete, cancelLoadingState },
  cancelReindex,
}) => {
  const progressBar = reindexTaskPercComplete ? (
    <EuiProgress size="s" value={reindexTaskPercComplete} max={1} />
  ) : (
    <EuiProgress size="s" />
  );

  let cancelText: React.ReactNode;
  switch (cancelLoadingState) {
    case LoadingState.Loading:
      cancelText = (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancellingLabel"
          defaultMessage="Cancelling…"
        />
      );
      break;
    case LoadingState.Success:
      cancelText = (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancelledLabel"
          defaultMessage="Cancelled"
        />
      );
      break;
    case LoadingState.Error:
      cancelText = 'Could not cancel';
      cancelText = (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.errorLabel"
          defaultMessage="Could not cancel"
        />
      );
      break;
    default:
      cancelText = (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancelLabel"
          defaultMessage="Cancel"
        />
      );
  }

  return (
    <EuiFlexGroup alignItems={'center'}>
      <EuiFlexItem>{progressBar}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={cancelReindex}
          disabled={
            cancelLoadingState === LoadingState.Loading ||
            status !== ReindexStatus.inProgress ||
            lastCompletedStep !== ReindexStep.reindexStarted
          }
          isLoading={cancelLoadingState === LoadingState.Loading}
        >
          {cancelText}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const orderedSteps = Object.values(ReindexStep).sort() as number[];

/**
 * Displays a list of steps in the reindex operation, the current status, a progress bar,
 * and any error messages that are encountered.
 */
export const ReindexProgress: React.FunctionComponent<{
  reindexState: ReindexState;
  cancelReindex: () => void;
}> = (props) => {
  const { errorMessage, indexGroup, lastCompletedStep = -1, status } = props.reindexState;
  const stepDetails = (thisStep: ReindexStep): Pick<StepProgressStep, 'status' | 'children'> => {
    const previousStep = orderedSteps[orderedSteps.indexOf(thisStep) - 1];

    if (status === ReindexStatus.failed && lastCompletedStep === previousStep) {
      return {
        status: 'failed',
        children: <ErrorCallout {...{ errorMessage }} />,
      };
    } else if (status === ReindexStatus.paused && lastCompletedStep === previousStep) {
      return {
        status: 'paused',
        children: <PausedCallout />,
      };
    } else if (status === ReindexStatus.cancelled && lastCompletedStep === previousStep) {
      return {
        status: 'cancelled',
      };
    } else if (status === undefined || lastCompletedStep < previousStep) {
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
  const reindexingDocsStep = {
    title: (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.reindexingDocumentsStepTitle"
        defaultMessage="Reindexing documents"
      />
    ),
  } as StepProgressStep;

  if (
    status === ReindexStatus.failed &&
    (lastCompletedStep === ReindexStep.newIndexCreated ||
      lastCompletedStep === ReindexStep.reindexStarted)
  ) {
    reindexingDocsStep.status = 'failed';
    reindexingDocsStep.children = <ErrorCallout {...{ errorMessage }} />;
  } else if (
    status === ReindexStatus.paused &&
    (lastCompletedStep === ReindexStep.newIndexCreated ||
      lastCompletedStep === ReindexStep.reindexStarted)
  ) {
    reindexingDocsStep.status = 'paused';
    reindexingDocsStep.children = <PausedCallout />;
  } else if (
    status === ReindexStatus.cancelled &&
    (lastCompletedStep === ReindexStep.newIndexCreated ||
      lastCompletedStep === ReindexStep.reindexStarted)
  ) {
    reindexingDocsStep.status = 'cancelled';
  } else if (status === undefined || lastCompletedStep < ReindexStep.newIndexCreated) {
    reindexingDocsStep.status = 'incomplete';
  } else if (
    lastCompletedStep === ReindexStep.newIndexCreated ||
    lastCompletedStep === ReindexStep.reindexStarted
  ) {
    reindexingDocsStep.status = 'inProgress';
    reindexingDocsStep.children = <ReindexProgressBar {...props} />;
  } else {
    reindexingDocsStep.status = 'complete';
  }

  const steps = [
    {
      title: (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.readonlyStepTitle"
          defaultMessage="Setting old index to read-only"
        />
      ),
      ...stepDetails(ReindexStep.readonly),
    },
    {
      title: (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.createIndexStepTitle"
          defaultMessage="Creating new index"
        />
      ),
      ...stepDetails(ReindexStep.newIndexCreated),
    },
    reindexingDocsStep,
    {
      title: (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.aliasSwapStepTitle"
          defaultMessage="Swapping original index with alias"
        />
      ),
      ...stepDetails(ReindexStep.aliasCreated),
    },
  ];

  // If this index is part of an index group, add the approriate group services steps.
  if (indexGroup === IndexGroup.ml) {
    steps.unshift({
      title: (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.pauseMlStepTitle"
          defaultMessage="Pausing Machine Learning jobs"
        />
      ),
      ...stepDetails(ReindexStep.indexGroupServicesStopped),
    });
    steps.push({
      title: (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.resumeMlStepTitle"
          defaultMessage="Resuming Machine Learning jobs"
        />
      ),
      ...stepDetails(ReindexStep.indexGroupServicesStarted),
    });
  } else if (indexGroup === IndexGroup.watcher) {
    steps.unshift({
      title: (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.stopWatcherStepTitle"
          defaultMessage="Stopping Watcher"
        />
      ),
      ...stepDetails(ReindexStep.indexGroupServicesStopped),
    });
    steps.push({
      title: (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.resumeWatcherStepTitle"
          defaultMessage="Resuming Watcher"
        />
      ),
      ...stepDetails(ReindexStep.indexGroupServicesStarted),
    });
  }

  return <StepProgress steps={steps} />;
};
