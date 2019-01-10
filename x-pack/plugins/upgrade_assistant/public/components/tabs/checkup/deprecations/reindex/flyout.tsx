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
  EuiOverlayMask,
  EuiPortal,
  EuiSpacer,
} from '@elastic/eui';
// @ts-ignore
import { euiZModal } from '@elastic/eui/dist/eui_theme_k6_light.json';
import { Subscription } from 'rxjs';
import { ReindexStatus } from '../../../../../../common/types';
import { LoadingState } from '../../../../types';
import { ReindexConfirmModal } from './confirm_modal';
import { ReindexPollingService, ReindexState } from './polling_service';
import { ReindexProgress } from './progress';
import { ReindexWarningSummary } from './warnings';

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
  startReindex: () => void;
  reindexState: ReindexState;
}> = ({ indexName, closeFlyout, startReindex, reindexState }) => {
  const {
    loadingState,
    status,
    reindexTaskPercComplete,
    lastCompletedStep,
    errorMessage,
    reindexWarnings,
  } = reindexState;
  const loading = loadingState === LoadingState.Loading || status === ReindexStatus.inProgress;

  const body =
    status !== undefined ? (
      <ReindexProgress
        lastCompletedStep={lastCompletedStep}
        reindexStatus={status}
        reindexTaskPercComplete={reindexTaskPercComplete}
        errorMessage={errorMessage}
      />
    ) : (
      <Fragment>
        <EuiCallOut title="Be careful" color="warning" iconType="help">
          While reindexing, the index will not be able to ingest new documents, update documents, or
          delete documents. Depending on how this index is being used in your system, this may cause
          problems and you may need to use a different strategy to reindex this index.
        </EuiCallOut>
        <EuiSpacer />
        <ReindexWarningSummary warnings={reindexWarnings} />
      </Fragment>
    );

  return (
    <EuiPortal>
      <EuiFlyout onClose={closeFlyout} aria-labelledby="Reindex" ownFocus size="m">
        <EuiFlyoutHeader hasBorder>
          <h2>Reindex {indexName}</h2>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{body}</EuiFlyoutBody>
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
                disabled={loading || status === ReindexStatus.completed}
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
}

interface ReindexFlyoutState {
  reindexState: ReindexState;
  showWarningsModal: boolean;
}

/**
 * Wrapper for the UI that manages setting up the polling service and subscribing to its state.
 */
export class ReindexFlyout extends React.Component<ReindexFlyoutProps, ReindexFlyoutState> {
  private service: ReindexPollingService;
  private subscription?: Subscription;

  constructor(props: ReindexFlyoutProps) {
    super(props);
    this.service = new ReindexPollingService(this.props.indexName);
    this.state = {
      reindexState: this.service.status$.value,
      showWarningsModal: false,
    };
  }

  public async componentDidMount() {
    this.subscription = this.service.status$.subscribe(reindexState =>
      this.setState({ reindexState })
    );
  }

  public async componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      delete this.subscription;
    }
  }

  public render() {
    return (
      <Fragment>
        <ReindexFlyoutUI startReindex={this.startReindex} {...this.props} {...this.state} />
        {this.renderWarningsModal()}
      </Fragment>
    );
  }

  private renderWarningsModal = () => {
    const {
      reindexState: { reindexWarnings },
      showWarningsModal,
    } = this.state;

    if (!showWarningsModal) {
      return null;
    }

    return (
      // @ts-ignore
      <EuiOverlayMask style={`z-index: ${euiZModal + 50}`}>
        <ReindexConfirmModal
          indexName={this.props.indexName}
          warnings={reindexWarnings!}
          closeModal={this.closeWarningsModal}
          startReindex={this.startReindex}
        />
      </EuiOverlayMask>
    );
  };

  private startReindex = () => {
    const { reindexWarnings } = this.state.reindexState;

    if (this.state.showWarningsModal) {
      this.setState({ showWarningsModal: false });
      this.service.startReindex();
    } else if (reindexWarnings && reindexWarnings.length > 0) {
      this.setState({ showWarningsModal: true });
    } else {
      this.service.startReindex();
    }
  };

  private closeWarningsModal = () => this.setState({ showWarningsModal: false });
}
