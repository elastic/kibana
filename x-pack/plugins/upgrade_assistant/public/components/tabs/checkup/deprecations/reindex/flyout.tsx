/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
} from '@elastic/eui';
import { ReindexStatus } from '../../../../../../common/types';
import { LoadingState } from '../../../../types';
import { ReindexState } from './polling_service';
import { ReindexProgress } from './progress';
import { WarningsConfirmationFlyout } from './warnings_confirmation';

const buttonLabel = (status?: ReindexStatus) => {
  switch (status) {
    case ReindexStatus.failed:
      return 'Try again';
    case ReindexStatus.inProgress:
      return 'Reindexing…';
    case ReindexStatus.completed:
      return 'Done!';
    default:
      return 'Start reindex';
  }
};

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */
export const ChecklistFlyout: React.StatelessComponent<{
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
}> = ({ closeFlyout, reindexState, startReindex }) => {
  const {
    loadingState,
    status,
    reindexTaskPercComplete,
    lastCompletedStep,
    errorMessage,
  } = reindexState;
  const loading = loadingState === LoadingState.Loading || status === ReindexStatus.inProgress;

  return (
    <Fragment>
      <EuiFlyoutBody>
        <EuiCallOut title="Be careful" color="warning" iconType="help">
          While reindexing, the index will not be able to ingest new documents, update documents, or
          delete documents. Depending on how this index is being used in your system, this may cause
          problems and you may need to use a different strategy to reindex this index.
        </EuiCallOut>
        <EuiSpacer />
        <ReindexProgress
          lastCompletedStep={lastCompletedStep}
          reindexStatus={status}
          reindexTaskPercComplete={reindexTaskPercComplete}
          errorMessage={errorMessage}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="primary"
              onClick={startReindex}
              isLoading={loading}
              disabled={loading || status === ReindexStatus.completed}
            >
              {buttonLabel(status)}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </Fragment>
  );
};

enum ReindexFlyoutStep {
  destructiveConfirmation,
  checklist,
}

interface ReindexFlyoutProps {
  indexName: string;
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
}

interface ReindexFlyoutState {
  currentFlyoutStep: ReindexFlyoutStep;
}

/**
 * Wrapper for the contents of the flyout that manages which step of the flyout to show.
 */
export class ReindexFlyout extends React.Component<ReindexFlyoutProps, ReindexFlyoutState> {
  constructor(props: ReindexFlyoutProps) {
    super(props);
    const { reindexWarnings } = props.reindexState;

    this.state = {
      currentFlyoutStep:
        reindexWarnings && reindexWarnings.length > 0
          ? ReindexFlyoutStep.destructiveConfirmation
          : ReindexFlyoutStep.checklist,
    };
  }

  public render() {
    const { closeFlyout, indexName, reindexState, startReindex } = this.props;
    const { currentFlyoutStep } = this.state;

    let flyoutContents: React.ReactNode;
    switch (currentFlyoutStep) {
      case ReindexFlyoutStep.destructiveConfirmation:
        flyoutContents = (
          <WarningsConfirmationFlyout
            closeFlyout={closeFlyout}
            warnings={reindexState.reindexWarnings!}
            advanceNextStep={this.advanceNextStep}
          />
        );
        break;
      case ReindexFlyoutStep.checklist:
        flyoutContents = (
          <ChecklistFlyout
            closeFlyout={closeFlyout}
            reindexState={reindexState}
            startReindex={startReindex}
          />
        );
        break;
      default:
        throw new Error(`Invalid flyout step: ${currentFlyoutStep}`);
    }

    return (
      <EuiPortal>
        <EuiFlyout onClose={closeFlyout} aria-labelledby="Reindex" ownFocus size="m">
          <EuiFlyoutHeader hasBorder>
            <h2>Reindex {indexName}</h2>
          </EuiFlyoutHeader>
          {flyoutContents}
        </EuiFlyout>
      </EuiPortal>
    );
  }

  public advanceNextStep = () => {
    this.setState({ currentFlyoutStep: ReindexFlyoutStep.checklist });
  };
}
