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
import { ReindexStatus } from 'x-pack/plugins/upgrade_assistant/server/lib/reindex_indices';
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

const ReindexProgress: React.StatelessComponent<{ status?: ReindexStatus }> = ({ status = -1 }) => (
  <EuiSteps
    steps={
      [
        {
          title: 'Index set to read-only',
          status: status >= ReindexStatus.readonly ? 'complete' : 'incomplete',
        },
        {
          title: 'New index created',
          status: status >= ReindexStatus.newIndexCreated ? 'complete' : 'incomplete',
        },
        {
          title: 'Reindexing started',
          status: status >= ReindexStatus.reindexStarted ? 'complete' : 'incomplete',
        },
        {
          title: 'Reindex completed',
          status: status >= ReindexStatus.reindexCompleted ? 'complete' : 'incomplete',
        },
        {
          title: 'Aliases switched over',
          status: status === ReindexStatus.completed ? 'complete' : 'incomplete',
        },
      ] as EuiStepsProps['steps']
    }
  />
);

interface ReindexFlyoutProps {
  indexName: string;
  closeFlyout: () => void;
}

interface ReindexFlyoutState {
  loadingState: LoadingState;
  status?: ReindexStatus;
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
    const { status } = this.state;

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
              disabled={Boolean(status && status >= 0)}
            >
              Begin reindex
            </EuiButton>
            <EuiSpacer />
            {Boolean(status !== undefined && status < ReindexStatus.completed) && (
              <EuiProgress size="xs" />
            )}
            <EuiSpacer />
            <ReindexProgress status={status} />
          </EuiFlyoutBody>
        </EuiFlyout>
      </EuiPortal>
    );
  }

  private startReindex = async (): Promise<void> => {
    const { indexName } = this.props;

    // Optimistically assume we get started.
    this.setState({ status: ReindexStatus.created });

    const request = APIClient.post(
      chrome.addBasePath(`/api/upgrade_assistant/reindex/${indexName}`)
    );

    // Kick off status checks immediately
    this.checkStatus(true);

    const resp = await request;
    this.updateStatus(resp.data.status);
  };

  private checkStatus = async (keepPollingOnFail: boolean): Promise<void> => {
    const { indexName } = this.props;

    try {
      const resp = await APIClient.get(
        chrome.addBasePath(`/api/upgrade_assistant/reindex/${indexName}`)
      );
      const { status } = resp.data;
      this.updateStatus(status);

      // If still not complete, poll again for status after POLL_INTERVAL
      if (status < ReindexStatus.reindexCompleted) {
        await delay(POLL_INTERVAL);
        return this.checkStatus(true);
      } else {
        // otherwise attempt to complete
        return this.completeReindex();
      }
    } catch (e) {
      if (e.response && e.response.status !== 404) {
        if (keepPollingOnFail) {
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

    const resp = await APIClient.put(
      chrome.addBasePath(`/api/upgrade_assistant/reindex/${indexName}`)
    );

    this.updateStatus(resp.data.status);
  };

  private updateStatus = (newStatus: ReindexStatus) => {
    // Ensure no request races make the checklist go backwards.
    if (this.state.status && this.state.status >= newStatus) {
      return;
    }
    this.setState({ status: newStatus });
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
