/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, ReactNode } from 'react';
import { Subscription } from 'rxjs';

import { EuiButton, EuiLoadingSpinner } from '@elastic/eui';
import { ReindexStatus } from '../../../../../../common/types';
import { LoadingState } from '../../../../types';
import { ReindexFlyout } from './flyout';
import { ReindexPollingService, ReindexState } from './polling_service';

interface ReindexButtonProps {
  indexName: string;
}

interface ReindexButtonState {
  flyoutVisible: boolean;
  reindexState: ReindexState;
}

/**
 * Displays a button that will display a flyout when clicked with the reindexing status for
 * the given `indexName`.
 */
export class ReindexButton extends React.Component<ReindexButtonProps, ReindexButtonState> {
  private service: ReindexPollingService;
  private subscription?: Subscription;

  constructor(props: ReindexButtonProps) {
    super(props);

    this.service = this.newService();
    this.state = {
      flyoutVisible: false,
      reindexState: this.service.status$.value,
    };
  }

  public async componentDidMount() {
    this.subscribeToUpdates();
  }

  public async componentWillUnmount() {
    this.unsubscribeToUpdates();
  }

  public componentDidUpdate(prevProps: ReindexButtonProps) {
    if (prevProps.indexName !== this.props.indexName) {
      this.unsubscribeToUpdates();
      this.service = this.newService();
      this.subscribeToUpdates();
    }
  }

  public render() {
    const { indexName } = this.props;
    const { flyoutVisible, reindexState } = this.state;

    const buttonProps: any = { size: 's', onClick: this.showFlyout };
    let buttonContent: ReactNode = 'Reindex';

    if (reindexState.loadingState === LoadingState.Loading) {
      buttonProps.disabled = true;
      buttonContent = 'Loading…';
    } else {
      switch (reindexState.status) {
        case ReindexStatus.inProgress:
          buttonContent = (
            <span>
              <EuiLoadingSpinner className="upgReindexButton__spinner" size="m" /> Reindexing…
            </span>
          );
          break;
        case ReindexStatus.completed:
          buttonProps.color = 'secondary';
          buttonProps.iconSide = 'left';
          buttonProps.iconType = 'check';
          buttonContent = 'Done';
          break;
        case ReindexStatus.failed:
          buttonProps.color = 'danger';
          buttonProps.iconSide = 'left';
          buttonProps.iconType = 'cross';
          buttonContent = 'Failed';
          break;
        case ReindexStatus.paused:
          buttonProps.color = 'warning';
          buttonProps.iconSide = 'left';
          buttonProps.iconType = 'pause';
          buttonContent = 'Paused';
      }
    }

    return (
      <Fragment>
        <EuiButton {...buttonProps}>{buttonContent}</EuiButton>

        {flyoutVisible && (
          <ReindexFlyout
            indexName={indexName}
            closeFlyout={this.closeFlyout}
            reindexState={reindexState}
            startReindex={this.service.startReindex}
          />
        )}
      </Fragment>
    );
  }

  private newService() {
    return new ReindexPollingService(this.props.indexName);
  }

  private subscribeToUpdates() {
    this.service.updateStatus();
    this.subscription = this.service!.status$.subscribe(reindexState =>
      this.setState({ reindexState })
    );
  }

  private unsubscribeToUpdates() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      delete this.subscription;
    }

    if (this.service) {
      this.service.stopPolling();
    }
  }

  private showFlyout = () => {
    this.setState({ flyoutVisible: true });
  };

  private closeFlyout = () => {
    this.setState({ flyoutVisible: false });
  };
}
