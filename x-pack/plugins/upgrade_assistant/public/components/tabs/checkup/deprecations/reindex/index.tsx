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
  errorMessage: string | null;
}> = ({ step = -1, reindexStatus, errorMessage }) => {
  const details = (
    thisStep: ReindexStep
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
        children: null,
      };
    }
  };

  return (
    <EuiSteps
      steps={[
        {
          title: 'Index set to read-only',
          ...details(ReindexStep.readonly),
        },
        {
          title: 'New index created',
          ...details(ReindexStep.newIndexCreated),
        },
        {
          title: 'Reindexing started',
          ...details(ReindexStep.reindexStarted),
        },
        {
          title: 'Reindex completed',
          ...details(ReindexStep.reindexCompleted),
        },
        {
          title: 'Aliases switched over',
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
  reindexStatus?: ReindexStatus;
  step?: ReindexStep;
  errorMessage: string | null;
}

const delay = (delayMs: number) => new Promise(resolve => setTimeout(resolve, delayMs));

class ReindexFlyout extends React.Component<ReindexFlyoutProps, ReindexFlyoutState> {
  constructor(props: ReindexFlyoutProps) {
    super(props);
    this.state = {
      loadingState: LoadingState.Loading,
      errorMessage: null,
    };
  }

  public async componentDidMount() {
    this.checkStatus();
  }

  public render() {
    const { indexName, closeFlyout } = this.props;
    const { loadingState, reindexStatus, step, errorMessage } = this.state;

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
            <EuiSpacer />
            <EuiButton
              color="warning"
              onClick={this.startReindex}
              disabled={loading || reindexStatus === ReindexStatus.completed}
            >
              {reindexStatus === ReindexStatus.failed ? 'Try again' : 'Begin reindex'}
            </EuiButton>
            <EuiSpacer />
            {loading && <EuiProgress size="xs" />}
            <EuiSpacer />
            <ReindexProgress
              step={step}
              reindexStatus={reindexStatus}
              errorMessage={errorMessage}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      </EuiPortal>
    );
  }

  private startReindex = async (): Promise<void> => {
    const { indexName } = this.props;
    const request = APIClient.post<ReindexOperation>(
      chrome.addBasePath(`/api/upgrade_assistant/reindex/${indexName}`)
    );

    const resp = await request;
    this.updateReindexState(resp.data);
    this.checkStatus();
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
      errorMessage: reindexOp.errorMessage,
    });
  };
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
