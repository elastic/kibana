/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { ReindexStatus, ReindexStep } from '../../../../../../../common/types';
import { CancelLoadingState } from '../../../../types';
import type { ReindexState } from '../use_reindex_state';
import { StepProgress, StepProgressStep } from './step_progress';
import { getReindexProgressLabel } from '../../../../../lib/utils';

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

const ReindexingDocumentsStepTitle: React.FunctionComponent<{
  reindexState: ReindexState;
  cancelReindex: () => void;
}> = ({ reindexState: { lastCompletedStep, status, cancelLoadingState }, cancelReindex }) => {
  if (status === ReindexStatus.cancelled) {
    return (
      <>
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelledTitle"
          defaultMessage="Reindexing cancelled"
        />
      </>
    );
  }
  const showCancelLink =
    status === ReindexStatus.inProgress && lastCompletedStep === ReindexStep.reindexStarted;

  let cancelText: React.ReactNode;
  switch (cancelLoadingState) {
    case CancelLoadingState.Requested:
    case CancelLoadingState.Loading:
      cancelText = (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancellingLabel"
          defaultMessage="Cancelling…"
        />
      );
      break;
    case CancelLoadingState.Success:
      cancelText = (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.cancelButton.cancelledLabel"
          defaultMessage="Cancelled"
        />
      );
      break;
    case CancelLoadingState.Error:
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
    <EuiFlexGroup component="span">
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.reindexingDocumentsStepTitle"
          defaultMessage="Reindexing documents"
        />
      </EuiFlexItem>
      {showCancelLink && (
        <EuiFlexItem>
          <EuiLink
            data-test-subj="cancelReindexingDocumentsButton"
            onClick={cancelReindex}
            disabled={cancelLoadingState !== undefined}
          >
            {cancelText}
          </EuiLink>
        </EuiFlexItem>
      )}
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
  const {
    errorMessage,
    lastCompletedStep = -1,
    status,
    reindexTaskPercComplete,
  } = props.reindexState;
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

  // The reindexing step is special because it generally lasts longer and can be cancelled mid-flight
  const reindexingDocsStep = {
    title: <ReindexingDocumentsStepTitle {...props} />,
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

  return (
    <>
      <EuiTitle size="xs" data-test-subj="reindexChecklistTitle">
        <h3>
          {status === ReindexStatus.inProgress ? (
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingInProgressTitle"
              defaultMessage="Reindexing in progress… {percents}"
              values={{
                percents: getReindexProgressLabel(reindexTaskPercComplete, lastCompletedStep),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklistTitle"
              defaultMessage="Reindexing process"
            />
          )}
        </h3>
      </EuiTitle>
      <StepProgress steps={steps} />
    </>
  );
};
