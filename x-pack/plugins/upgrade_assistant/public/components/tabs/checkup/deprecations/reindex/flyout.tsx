/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { Subscription } from 'rxjs';
import { ReindexStatus } from '../../../../../../common/types';
import { LoadingState } from '../../../../types';
import { ReindexPollingService, ReindexState } from './polling_service';
import { ReindexProgress } from './progress';

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
  } = reindexState;
  const loading = loadingState === LoadingState.Loading || status === ReindexStatus.inProgress;

  return (
    <EuiPortal>
      <EuiFlyout onClose={closeFlyout} aria-labelledby="Reindex" ownFocus size="m">
        <EuiFlyoutHeader hasBorder>
          <h2>Reindex {indexName}</h2>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>
            <p>This tool can be used to reindex old indices.</p>
          </EuiText>
          <EuiSpacer />
          <EuiCallOut title="This may cause problems" color="warning" iconType="help">
            During a reindex, the index will not be able to ingest new documents, update documents,
            or delete documents. Depending on how this index is being used in your system, this may
            cause problems and you may need to use a different strategy to reindex this index.
          </EuiCallOut>
          <EuiSpacer size="xl" />
          <ReindexProgress
            lastCompletedStep={lastCompletedStep}
            reindexStatus={status}
            reindexTaskPercComplete={reindexTaskPercComplete}
            errorMessage={errorMessage}
          />
          <EuiButton
            color="warning"
            onClick={startReindex}
            isLoading={loading}
            disabled={loading || status === ReindexStatus.completed}
          >
            {buttonLabel(status)}
          </EuiButton>
        </EuiFlyoutBody>
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
      <ReindexFlyoutUI startReindex={this.service.startReindex} {...this.props} {...this.state} />
    );
  }
}
