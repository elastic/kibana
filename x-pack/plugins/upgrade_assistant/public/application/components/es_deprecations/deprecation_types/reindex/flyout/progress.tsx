/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  EuiTitle,
  EuiCode,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

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
          defaultMessage="Reindexing cancelled."
        />
      </>
    );
  }

  // step is in progress after the new index is created and while it's not completed yet
  const stepInProgress =
    status === ReindexStatus.inProgress &&
    (lastCompletedStep === ReindexStep.newIndexCreated ||
      lastCompletedStep === ReindexStep.reindexStarted);
  // but the reindex can only be cancelled after it has started
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
        {stepInProgress ? (
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.reindexingDocumentsStepTitle"
            defaultMessage="Reindexing documents."
          />
        ) : (
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.reindexingDocumentsStepTitle"
            defaultMessage="Reindex documents."
          />
        )}
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

const getStepTitle = (
  step: ReindexStep,
  meta: ReindexState['meta'],
  inProgress?: boolean
): ReactNode => {
  if (step === ReindexStep.readonly) {
    return inProgress ? (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.readonlyStepTitle"
        defaultMessage="Setting {indexName} index to read-only."
        values={{
          indexName: <EuiCode>{meta.indexName}</EuiCode>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.readonlyStepTitle"
        defaultMessage="Set {indexName} index to read-only."
        values={{
          indexName: <EuiCode>{meta.indexName}</EuiCode>,
        }}
      />
    );
  }

  if (step === ReindexStep.newIndexCreated) {
    return inProgress ? (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.createIndexStepTitle"
        defaultMessage="Creating {reindexName} index."
        values={{
          reindexName: <EuiCode>{meta.reindexName}</EuiCode>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.createIndexStepTitle"
        defaultMessage="Create {reindexName} index."
        values={{
          reindexName: <EuiCode>{meta.reindexName}</EuiCode>,
        }}
      />
    );
  }

  if (step === ReindexStep.aliasCreated) {
    return inProgress ? (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.aliasCreatedStepTitle"
        defaultMessage="Creating {indexName} alias for {reindexName} index."
        values={{
          indexName: <EuiCode>{meta.indexName}</EuiCode>,
          reindexName: <EuiCode>{meta.reindexName}</EuiCode>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.aliasCreatedStepTitle"
        defaultMessage="Create {indexName} alias for {reindexName} index."
        values={{
          indexName: <EuiCode>{meta.indexName}</EuiCode>,
          reindexName: <EuiCode>{meta.reindexName}</EuiCode>,
        }}
      />
    );
  }

  if (step === ReindexStep.originalIndexDeleted) {
    return inProgress ? (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.originalIndexDeletedStepTitle"
        defaultMessage="Deleting original {indexName} index."
        values={{
          indexName: <EuiCode>{meta.indexName}</EuiCode>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.originalIndexDeletedStepTitle"
        defaultMessage="Delete original {indexName} index."
        values={{
          indexName: <EuiCode>{meta.indexName}</EuiCode>,
        }}
      />
    );
  }

  if (step === ReindexStep.existingAliasesUpdated) {
    return inProgress ? (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.inProgress.aliasesUpdatedStepTitle"
        defaultMessage="Updating {existingAliases} aliases to point to {reindexName} index."
        values={{
          existingAliases: <EuiCode>{`[${meta.aliases.join(',')}]`}</EuiCode>,
          reindexName: <EuiCode>{meta.reindexName}</EuiCode>,
        }}
      />
    ) : (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingChecklist.aliasesUpdatedStepTitle"
        defaultMessage="Update {existingAliases} aliases to point to {reindexName} index."
        values={{
          existingAliases: <EuiCode>{`[${meta.aliases.join(',')}]`}</EuiCode>,
          reindexName: <EuiCode>{meta.reindexName}</EuiCode>,
        }}
      />
    );
  }
};

interface Props {
  reindexState: ReindexState;
  cancelReindex: () => void;
}

/**
 * Displays a list of steps in the reindex operation, the current status, a progress bar,
 * and any error messages that are encountered.
 */
export const ReindexProgress: React.FunctionComponent<Props> = (props) => {
  const {
    errorMessage,
    lastCompletedStep = -1,
    status,
    reindexTaskPercComplete,
    meta,
  } = props.reindexState;

  const getProgressStep = (thisStep: ReindexStep): StepProgressStep => {
    const previousStep = orderedSteps[orderedSteps.indexOf(thisStep) - 1];

    if (status === ReindexStatus.failed && lastCompletedStep === previousStep) {
      return {
        title: getStepTitle(thisStep, meta),
        status: 'failed',
        children: <ErrorCallout {...{ errorMessage }} />,
      };
    } else if (status === ReindexStatus.paused && lastCompletedStep === previousStep) {
      return {
        title: getStepTitle(thisStep, meta),
        status: 'paused',
        children: <PausedCallout />,
      };
    } else if (status === ReindexStatus.cancelled && lastCompletedStep === previousStep) {
      return {
        title: getStepTitle(thisStep, meta),
        status: 'cancelled',
      };
    } else if (status === undefined || lastCompletedStep < previousStep) {
      return {
        title: getStepTitle(thisStep, meta),
        status: 'incomplete',
      };
    } else if (lastCompletedStep === previousStep) {
      return {
        title: getStepTitle(thisStep, meta, true),
        status: 'inProgress',
      };
    } else {
      return {
        title: getStepTitle(thisStep, meta),
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
    getProgressStep(ReindexStep.readonly),
    getProgressStep(ReindexStep.newIndexCreated),
    reindexingDocsStep,
    getProgressStep(ReindexStep.aliasCreated),
    getProgressStep(ReindexStep.originalIndexDeleted),
  ];

  const hasExistingAliases = meta.aliases.length > 0;

  if (hasExistingAliases) {
    steps.push(getProgressStep(ReindexStep.existingAliasesUpdated));
  }

  return (
    <>
      <EuiTitle size="xs" data-test-subj="reindexChecklistTitle">
        <h3>
          {status === ReindexStatus.inProgress ? (
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.reindexingInProgressTitle"
              defaultMessage="Reindexing in progress… {percents}"
              values={{
                percents: getReindexProgressLabel(
                  reindexTaskPercComplete,
                  lastCompletedStep,
                  hasExistingAliases
                ),
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
