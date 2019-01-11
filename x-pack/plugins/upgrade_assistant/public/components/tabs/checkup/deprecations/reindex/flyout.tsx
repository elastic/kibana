/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, HTMLAttributes } from 'react';

import {
  CommonProps,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { ReindexStatus } from '../../../../../../common/types';
import { LoadingState } from '../../../../types';
import { ReindexState } from './polling_service';
import { ReindexProgress } from './progress';
import { ReindexWarningSummary } from './warnings';

export const EuiFlyoutBodyTyped: React.SFC<
  CommonProps & HTMLAttributes<HTMLDivElement>
> = EuiFlyoutBody;

const buttonLabel = (status?: ReindexStatus) => {
  switch (status) {
    case ReindexStatus.failed:
      return 'Try again';
    case ReindexStatus.inProgress:
      return 'Reindexing…';
    case ReindexStatus.completed:
      return 'Done!';
    default:
      return 'Start reindexing';
  }
};

/**
 * Displays a flyout that shows the current reindexing status for a given index.
 */
export const ReindexFlyoutUI: React.StatelessComponent<{
  indexName: string;
  closeFlyout: () => void;
  confirmInputValue: string;
  onConfirmInputChange: (e: any) => void;
  reindexState: ReindexState;
  startReindex: () => void;
}> = ({
  indexName,
  closeFlyout,
  confirmInputValue,
  onConfirmInputChange,
  reindexState,
  startReindex,
}) => {
  const {
    loadingState,
    status,
    reindexTaskPercComplete,
    lastCompletedStep,
    errorMessage,
    reindexWarnings,
  } = reindexState;
  const loading = loadingState === LoadingState.Loading || status === ReindexStatus.inProgress;
  const hasWarnings = Boolean(reindexWarnings && reindexWarnings.length);
  const confirmFilled = confirmInputValue === 'CONFIRM';

  return (
    <EuiPortal>
      <EuiFlyout onClose={closeFlyout} aria-labelledby="Reindex" ownFocus size="m">
        <EuiFlyoutHeader hasBorder>
          <h2>Reindex {indexName}</h2>
        </EuiFlyoutHeader>
        <EuiFlyoutBodyTyped style={{ display: 'flex' }}>
          <EuiFlexGroup direction="column" justifyContent="spaceBetween" style={{ flexGrow: 1 }}>
            <EuiFlexItem grow={false}>
              <EuiCallOut title="Be careful" color="warning" iconType="help">
                While reindexing, the index will not be able to ingest new documents, update
                documents, or delete documents. Depending on how this index is being used in your
                system, this may cause problems and you may need to use a different strategy to
                reindex this index.
              </EuiCallOut>
              <EuiSpacer />
              <ReindexWarningSummary warnings={reindexWarnings} />
              <EuiSpacer />
              {status !== undefined && (
                <ReindexProgress
                  lastCompletedStep={lastCompletedStep}
                  reindexStatus={status}
                  reindexTaskPercComplete={reindexTaskPercComplete}
                  errorMessage={errorMessage}
                />
              )}
            </EuiFlexItem>
            {hasWarnings && status === undefined && (
              <EuiFlexItem grow={false}>
                <EuiText>
                  <strong>Type "CONFIRM" below if you accept these changes</strong>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiFieldText
                  placeholder="CONFIRM"
                  fullWidth
                  value={confirmInputValue}
                  onChange={onConfirmInputChange}
                  aria-label="Reindex confirmation"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutBodyTyped>
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
                color="warning"
                onClick={startReindex}
                isLoading={loading}
                disabled={
                  loading || status === ReindexStatus.completed || (hasWarnings && !confirmFilled)
                }
              >
                {buttonLabel(status)}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};

interface ReindexFlyoutProps {
  indexName: string;
  closeFlyout: () => void;
  reindexState: ReindexState;
  startReindex: () => void;
}

interface ReindexFlyoutState {
  confirmInputValue: string;
}

/**
 * Wrapper for the UI that manages setting up the polling service and subscribing to its state.
 */
export class ReindexFlyout extends React.Component<ReindexFlyoutProps, ReindexFlyoutState> {
  constructor(props: ReindexFlyoutProps) {
    super(props);
    this.state = {
      confirmInputValue: '',
    };
  }

  public render() {
    const { closeFlyout, indexName, reindexState, startReindex } = this.props;
    const { confirmInputValue } = this.state;

    return (
      <Fragment>
        <ReindexFlyoutUI
          closeFlyout={closeFlyout}
          indexName={indexName}
          confirmInputValue={confirmInputValue}
          onConfirmInputChange={this.onConfirmInputChange}
          reindexState={reindexState}
          startReindex={startReindex}
        />
      </Fragment>
    );
  }

  private onConfirmInputChange = (e: any) => {
    this.setState({ confirmInputValue: e.target.value });
  };
}
