/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosError } from 'axios';
import React, { Fragment } from 'react';
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
  EuiStepsProps,
  EuiText,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import {
  ReindexOperation,
  ReindexStatus,
  ReindexStep,
} from 'x-pack/plugins/upgrade_assistant/server/lib/reindex_indices';
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
}> = ({ step = -1, reindexStatus }) => {
  const getStatus = (thisStep: ReindexStep): 'complete' | 'incomplete' | 'danger' => {
    if (reindexStatus === undefined) {
      return 'incomplete';
    } else if (reindexStatus === ReindexStatus.failed && step + 1 === thisStep) {
      return 'danger';
    } else {
      return step >= thisStep ? 'complete' : 'incomplete';
    }
  };

  return (
    <EuiSteps
      steps={
        [
          {
            title: 'Index set to read-only',
            status: getStatus(ReindexStep.readonly),
          },
          {
            title: 'New index created',
            status: getStatus(ReindexStep.newIndexCreated),
          },
          {
            title: 'Reindexing started',
            status: getStatus(ReindexStep.reindexStarted),
          },
          {
            title: 'Reindex completed',
            status: getStatus(ReindexStep.reindexCompleted),
          },
          {
            title: 'Aliases switched over',
            status: getStatus(ReindexStep.aliasCreated),
          },
        ] as EuiStepsProps['steps']
      }
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
}

const delay = (delayMs: number) => new Promise(resolve => setTimeout(resolve, delayMs));

class ReindexFlyout extends React.Component<ReindexFlyoutProps, ReindexFlyoutState> {
  constructor(props: ReindexFlyoutProps) {
    super(props);
    this.state = {
      loadingState: LoadingState.Loading,
    };
  }

  public async componentDidMount() {
    await this.checkStatus(false);
    this.setState({ loadingState: LoadingState.Success });
  }

  public render() {
    const { indexName, closeFlyout } = this.props;
    const { loadingState, reindexStatus, step } = this.state;

    const loading =
      loadingState === LoadingState.Loading || reindexStatus === ReindexStatus.inProgress;

    return (
      <EuiPortal>
        <EuiFlyout onClose={closeFlyout} aria-labelledby="Reindex" ownFocus size="s">
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
              {/* TODO: Show different text if last attempt failed? */}
              Begin reindex
            </EuiButton>
            <EuiSpacer />
            {loading && <EuiProgress size="xs" />}
            <EuiSpacer />
            <ReindexProgress step={step} reindexStatus={reindexStatus} />
          </EuiFlyoutBody>
        </EuiFlyout>
      </EuiPortal>
    );
  }

  private startReindex = async (): Promise<void> => {
    const { indexName } = this.props;

    // Optimistically assume we get started.
    this.setState({ reindexStatus: ReindexStatus.inProgress, step: ReindexStep.created });

    const request = APIClient.post<ReindexOperation>(
      chrome.addBasePath(`/api/upgrade_assistant/reindex/${indexName}`)
    );

    // Kick off status checks immediately
    this.checkStatus(true);

    const resp = await request;
    this.updateReindexState(resp.data);
  };

  private checkStatus = async (poll: boolean): Promise<void> => {
    const { indexName } = this.props;

    try {
      const resp = await APIClient.get<ReindexOperation>(
        chrome.addBasePath(`/api/upgrade_assistant/reindex/${indexName}`)
      );
      this.updateReindexState(resp.data);

      // If still not complete, poll again for status after POLL_INTERVAL
      if (resp.data.status !== ReindexStatus.inProgress) {
        return;
      } else if (resp.data.lastCompletedStep < ReindexStep.reindexCompleted) {
        await delay(POLL_INTERVAL);
        return this.checkStatus(true);
      } else {
        // otherwise attempt to complete
        return this.completeReindex();
      }
    } catch (e) {
      if (e.response && e.response.status === 404) {
        if (poll) {
          // for 404s, just check again
          await delay(POLL_INTERVAL);
          return this.checkStatus(true);
        }
      } else {
        throw e;
      }
    }
  };

  private completeReindex = async (): Promise<void> => {
    const { indexName } = this.props;

    const resp = await APIClient.put<ReindexOperation>(
      chrome.addBasePath(`/api/upgrade_assistant/reindex/${indexName}`)
    );

    // TODO: when complete, or on close?, refresh the depreaction list
    this.updateReindexState(resp.data);
  };

  private updateReindexState = (reindexOp: ReindexOperation) => {
    // Ensure no request races make the checklist go backwards.
    if (this.state.step && this.state.step > reindexOp.lastCompletedStep) {
      return;
    }

    this.setState({ step: reindexOp.lastCompletedStep, reindexStatus: reindexOp.status });
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
