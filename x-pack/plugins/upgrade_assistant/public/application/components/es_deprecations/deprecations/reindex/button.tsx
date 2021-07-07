/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import React, { Fragment, ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { Subscription } from 'rxjs';

import { EuiButton, EuiLoadingSpinner, EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { DocLinksStart, HttpSetup } from 'src/core/public';
import { API_BASE_PATH } from '../../../../../../common/constants';
import { ReindexAction, ReindexStatus, UIReindexOption } from '../../../../../../common/types';
import { LoadingState } from '../../../types';
import { ReindexFlyout } from './flyout';
import { ReindexPollingService, ReindexState } from './polling_service';

interface ReindexButtonProps {
  indexName: string;
  http: HttpSetup;
  docLinks: DocLinksStart;
  reindexBlocker?: ReindexAction['blockerForReindexing'];
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
    const { indexName, reindexBlocker, docLinks } = this.props;
    const { flyoutVisible, reindexState } = this.state;

    const buttonProps: any = { size: 's', onClick: this.showFlyout };
    let buttonContent: ReactNode = (
      <FormattedMessage
        id="xpack.upgradeAssistant.checkupTab.reindexing.reindexButton.reindexLabel"
        defaultMessage="Reindex"
      />
    );

    if (reindexState.loadingState === LoadingState.Loading) {
      buttonProps.disabled = true;
      buttonContent = (
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.reindexButton.loadingLabel"
          defaultMessage="Loading…"
        />
      );
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
          buttonContent = (
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.reindexButton.doneLabel"
              defaultMessage="Done"
            />
          );
          break;
        case ReindexStatus.failed:
          buttonProps.color = 'danger';
          buttonProps.iconSide = 'left';
          buttonProps.iconType = 'cross';
          buttonContent = (
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.reindexButton.failedLabel"
              defaultMessage="Failed"
            />
          );
          break;
        case ReindexStatus.paused:
          buttonProps.color = 'warning';
          buttonProps.iconSide = 'left';
          buttonProps.iconType = 'pause';
          buttonContent = (
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.reindexButton.pausedLabel"
              defaultMessage="Paused"
            />
          );
        case ReindexStatus.cancelled:
          buttonProps.color = 'danger';
          buttonProps.iconSide = 'left';
          buttonProps.iconType = 'cross';
          buttonContent = (
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.reindexButton.cancelledLabel"
              defaultMessage="Cancelled"
            />
          );
          break;
      }
    }

    const showIndexedClosedWarning =
      reindexBlocker === 'index-closed' && reindexState.status !== ReindexStatus.completed;

    if (showIndexedClosedWarning) {
      buttonProps.color = 'warning';
      buttonProps.iconType = 'alert';
    }

    const button = <EuiButton {...buttonProps}>{buttonContent}</EuiButton>;

    return (
      <Fragment>
        {showIndexedClosedWarning ? (
          <EuiToolTip
            position="top"
            content={
              <EuiText size="s">
                {i18n.translate(
                  'xpack.upgradeAssistant.checkupTab.reindexing.reindexButton.indexClosedToolTipDetails',
                  {
                    defaultMessage:
                      '"{indexName}" needs to be reindexed, but it is currently closed. The Upgrade Assistant will open, reindex and then close the index. Reindexing may take longer than usual.',
                    values: { indexName },
                  }
                )}
              </EuiText>
            }
          >
            {button}
          </EuiToolTip>
        ) : (
          button
        )}

        {flyoutVisible && (
          <ReindexFlyout
            reindexBlocker={reindexBlocker}
            docLinks={docLinks}
            indexName={indexName}
            closeFlyout={this.closeFlyout}
            reindexState={reindexState}
            startReindex={this.startReindex}
            cancelReindex={this.cancelReindex}
          />
        )}
      </Fragment>
    );
  }

  private newService() {
    const { indexName, http } = this.props;
    return new ReindexPollingService(indexName, http);
  }

  private subscribeToUpdates() {
    this.service.updateStatus();
    this.subscription = this.service!.status$.subscribe((reindexState) =>
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

  private startReindex = async () => {
    if (!this.state.reindexState.status) {
      // if status didn't exist we are starting a reindex action
      this.sendUIReindexTelemetryInfo('start');
    }

    await this.service.startReindex();
  };

  private cancelReindex = async () => {
    this.sendUIReindexTelemetryInfo('stop');
    await this.service.cancelReindex();
  };

  private showFlyout = () => {
    this.sendUIReindexTelemetryInfo('open');
    this.setState({ flyoutVisible: true });
  };

  private closeFlyout = () => {
    this.sendUIReindexTelemetryInfo('close');
    this.setState({ flyoutVisible: false });
  };

  private async sendUIReindexTelemetryInfo(uiReindexAction: UIReindexOption) {
    await this.props.http.put(`${API_BASE_PATH}/stats/ui_reindex`, {
      body: JSON.stringify(set({}, uiReindexAction, true)),
    });
  }
}
