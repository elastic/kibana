/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { get } from 'lodash';
import React, { Component, Fragment } from 'react';
import { JobInfo, jobQueueClient } from '../lib/job_queue_client';

interface Props {
  jobId: string;
}

interface State {
  isLoading: boolean;
  isFlyoutVisible: boolean;
  calloutTitle: string;
  info: JobInfo | null;
}

const NA = 'n/a';

export class ReportInfoButton extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      isLoading: false,
      isFlyoutVisible: false,
      calloutTitle: 'Job info',
      info: null,
    };

    this.closeFlyout = this.closeFlyout.bind(this);
    this.showFlyout = this.showFlyout.bind(this);
  }

  public renderInfo() {
    const { info } = this.state;
    if (!info) {
      return null;
    }

    // TODO browser type
    return (
      <Fragment>
        <ul>
          <li>Created By: {get(info, 'created_by', NA)}</li>
          <li>Created At: {get(info, 'created_at', NA)}</li>
          <li>Started At: {get(info, 'started_at', NA)}</li>
          <li>Completed At: {get(info, 'completed_at', NA)}</li>
          <li>Browser Timezone: {get(info, 'payload.browserTimezone', NA)}</li>
        </ul>
        <ul>
          <li>Title: {get(info, 'payload.title', NA)}</li>
          <li>Type: {get(info, 'payload.type', NA)}</li>
          <li>Layout: {get(info, 'meta.layout', NA)}</li>
          <li>
            Width: {get(info, 'payload.layout.dimensions.width', NA)} Height:{' '}
            {get(info, 'payload.layout.dimensions.height', NA)}
          </li>
          <li>Job Type: {get(info, 'jobtype', NA)}</li>
          <li>Content Type: {get(info, 'output.content_type') || NA}</li>
        </ul>
        <ul>
          <li>Attempts: {get(info, 'attempts', NA)}</li>
          <li>Max Attempts: {get(info, 'max_attempts', NA)}</li>
          <li>Priority: {get(info, 'priority', NA)}</li>
          <li>Timeout: {get(info, 'timeout', NA)}</li>
          <li>Status: {get(info, 'status', NA)}</li>
        </ul>
      </Fragment>
    );
  }

  public componentWillUnmount() {
    this.mounted = false;
  }

  public componentDidMount() {
    this.mounted = true;
  }

  public render() {
    let flyout;

    if (this.state.isFlyoutVisible) {
      flyout = (
        <EuiPortal>
          <EuiFlyout ownFocus onClose={this.closeFlyout} size="s" aria-labelledby="flyoutTitle">
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="s">
                <h2 id="flyoutTitle">{this.state.calloutTitle}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiText>{this.renderInfo()}</EuiText>
            </EuiFlyoutBody>
          </EuiFlyout>
        </EuiPortal>
      );
    }

    return (
      <Fragment>
        <EuiButtonIcon
          onClick={this.showFlyout}
          iconType="iInCircle"
          color={'primary'}
          aria-label="Show report info"
        />
        {flyout}
      </Fragment>
    );
  }

  private loadInfo = async () => {
    this.setState({ isLoading: true });
    try {
      const info: JobInfo = await jobQueueClient.getInfo(this.props.jobId);
      if (this.mounted) {
        this.setState({ isLoading: false, info });
      }
    } catch (kfetchError) {
      if (this.mounted) {
        this.setState({
          isLoading: false,
          calloutTitle: 'Unable to fetch report info',
          info: kfetchError.message,
        });
      }
    }
  };

  private closeFlyout = () => {
    this.setState({ isFlyoutVisible: false });
  };

  private showFlyout = () => {
    this.setState({ isFlyoutVisible: true });

    if (!this.state.info) {
      this.loadInfo();
    }
  };
}
