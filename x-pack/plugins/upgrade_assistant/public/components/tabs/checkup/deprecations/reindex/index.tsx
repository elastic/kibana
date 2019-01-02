/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import React, { Fragment, ReactNode } from 'react';
import chrome from 'ui/chrome';

import {
  EuiButton,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiProgress,
  EuiSteps,
  EuiText,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import {
  ReindexOperation,
  ReindexStatus,
  ReindexStep,
} from 'x-pack/plugins/upgrade_assistant/server/lib/reindex_service';
import { LoadingState } from '../../../../types';

const POLL_INTERVAL = 1000;
const XSRF = chrome.getXsrfToken();

const APIClient = axios.create({
  headers: {
    Accept: 'application/json',
    credentials: 'same-origin',
    'Content-Type': 'application/json',
    'kbn-version': XSRF,
    'kbn-xsrf': XSRF,
  },
});

const ReindexProgress: React.StatelessComponent<{
  step?: ReindexStep;
  reindexStatus?: ReindexStatus;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
}> = ({ step = -1, reindexStatus, reindexTaskPercComplete, errorMessage }) => {
  const details = (
    thisStep: ReindexStep,
    otherContent: ReactNode = null
  ): { status: 'complete' | 'incomplete' | 'danger'; children: ReactNode } => {
    if (reindexStatus === undefined) {
      return { status: 'incomplete', children: null };
    } else if (reindexStatus === ReindexStatus.failed && step + 1 === thisStep) {
      return {
        status: 'danger',
        children: (
          <EuiCallOut color="danger" title="There was an error">
            <EuiText>
              <p>{errorMessage}</p>
            </EuiText>
          </EuiCallOut>
        ),
      };
    } else {
      return {
        status: step >= thisStep ? 'complete' : 'incomplete',
        children: otherContent,
      };
    }
  };

  const reindexProgressBar =
    step < ReindexStep.reindexStarted ? null : reindexTaskPercComplete === 0 ? (
      <EuiProgress size="s" />
    ) : (
      <EuiProgress size="s" value={reindexTaskPercComplete || 0} max={1} />
    );

  return (
    <EuiSteps
      steps={[
        {
          title: 'Setting old index to read-only',
          ...details(ReindexStep.readonly),
        },
        {
          title: 'Creating new index',
          ...details(ReindexStep.newIndexCreated),
        },
        {
          title: 'Reindexing documents',
          ...details(ReindexStep.reindexCompleted, reindexProgressBar),
        },
        {
          title: 'Creating alias',
          ...details(ReindexStep.aliasCreated),
        },
      ]}
    />
  );
};

interface ReindexFlyoutProps {
  indexName: string;
  closeFlyout: () => void;
}

interface ReindexFlyoutState {
  loadingState: LoadingState;
  step?: ReindexStep;
  reindexStatus?: ReindexStatus;
  reindexTaskPercComplete: number | null;
  errorMessage: string | null;
}

class ReindexFlyout extends React.Component<ReindexFlyoutProps, ReindexFlyoutState> {
  constructor(props: ReindexFlyoutProps) {
    super(props);
    this.state = {
      loadingState: LoadingState.Loading,
      errorMessage: null,
      reindexTaskPercComplete: null,
    };
  }

  public async componentDidMount() {
    this.checkStatus();
  }

  public render() {
    const { indexName, closeFlyout } = this.props;
    const { loadingState, reindexStatus, reindexTaskPercComplete, step, errorMessage } = this.state;

    const loading =
      loadingState === LoadingState.Loading || reindexStatus === ReindexStatus.inProgress;

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
              During a reindex, the index will not be able to ingest new documents, update
              documents, or delete documents. Depending on how this index is being used in your
              system, this may cause problems and you may need to use a different strategy to
              reindex this index.
            </EuiCallOut>
            <EuiSpacer size="xl" />
            <ReindexProgress
              step={step}
              reindexStatus={reindexStatus}
              reindexTaskPercComplete={reindexTaskPercComplete}
              errorMessage={errorMessage}
            />
            <EuiButton
              color="warning"
              onClick={this.startReindex}
              isLoading={loading}
              disabled={loading || reindexStatus === ReindexStatus.completed}
            >
              {this.buttonLabel}
            </EuiButton>
          </EuiFlyoutBody>
        </EuiFlyout>
      </EuiPortal>
    );
  }

  private startReindex = async (): Promise<void> => {
    const { indexName } = this.props;

    try {
      // Optimistically assume it will start.
      this.setState({ reindexStatus: ReindexStatus.inProgress });
      const request = APIClient.post<ReindexOperation>(
        chrome.addBasePath(`/api/upgrade_assistant/reindex/${indexName}`)
      );

      const resp = await request;
      this.updateReindexState(resp.data);
      this.checkStatus();
    } catch (e) {
      this.setState({ reindexStatus: ReindexStatus.failed });
    }
  };

  private checkStatus = async (): Promise<void> => {
    const { indexName } = this.props;

    try {
      const resp = await APIClient.get<ReindexOperation>(
        chrome.addBasePath(`/api/upgrade_assistant/reindex/${indexName}`)
      );
      this.updateReindexState(resp.data);

      if (resp.data.status === ReindexStatus.inProgress) {
        setTimeout(this.checkStatus, POLL_INTERVAL);
      }
    } catch (e) {
      if (e.response && e.response.status === 404) {
        // for 404s ignore
      } else {
        throw e;
      }
    }

    if (this.state.loadingState === LoadingState.Loading) {
      this.setState({ loadingState: LoadingState.Success });
    }
  };

  private updateReindexState = (reindexOp: ReindexOperation) => {
    // Ensure no request races make the checklist go backwards.
    if (this.state.step && this.state.step > reindexOp.lastCompletedStep) {
      return;
    }

    this.setState({
      step: reindexOp.lastCompletedStep,
      reindexStatus: reindexOp.status,
      reindexTaskPercComplete: reindexOp.reindexTaskPercComplete,
      errorMessage: reindexOp.errorMessage,
    });
  };

  private get buttonLabel() {
    const { reindexStatus } = this.state;
    switch (reindexStatus) {
      case ReindexStatus.failed:
        return 'Try again';
      case ReindexStatus.inProgress:
        return 'Reindexing…';
      case ReindexStatus.completed:
        return 'Done!';
      default:
        return 'Start reindexing';
    }
  }
}

interface ReindexButtonProps {
  indexName: string;
}

interface ReindexButtonState {
  flyoutVisible: boolean;
}

// tslint:disable-next-line:max-classes-per-file
export class ReindexButton extends React.Component<ReindexButtonProps, ReindexButtonState> {
  constructor(props: ReindexButtonProps) {
    super(props);

    this.state = {
      flyoutVisible: false,
    };
  }

  public render() {
    const { indexName } = this.props;
    const { flyoutVisible } = this.state;

    return (
      <Fragment>
        <EuiButton size="s" onClick={this.showFlyout}>
          Reindex
        </EuiButton>

        {flyoutVisible && <ReindexFlyout indexName={indexName} closeFlyout={this.closeFlyout} />}
      </Fragment>
    );
  }

  private showFlyout = () => {
    this.setState({ flyoutVisible: true });
  };

  private closeFlyout = () => {
    this.setState({ flyoutVisible: false });
  };
}
