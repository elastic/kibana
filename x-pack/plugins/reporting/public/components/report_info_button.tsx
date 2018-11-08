/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiCallOut, EuiPopover } from '@elastic/eui';
import { get } from 'lodash';
import React, { Component, Fragment } from 'react';
import { JobInfo, jobQueueClient } from '../lib/job_queue_client';

interface Props {
  jobId: string;
}

interface State {
  isLoading: boolean;
  isPopoverOpen: boolean;
  calloutTitle: string;
  info: JobInfo | null;
}

export class ReportInfoButton extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      isLoading: false,
      isPopoverOpen: false,
      calloutTitle: 'Job info',
      info: null,
    };
  }

  public renderInfo() {
    const { info } = this.state;
    if (!info) {
      return null;
    }

    const iGet = (path: string) => get(info, path, 'n/a');

    // TODO browser type
    return (
      <Fragment>
        <ul>
          <li>Created By: {iGet('created_by')}</li>
          <li>Created At: {iGet('created_at')}</li>
          <li>Started At: {iGet('started_at')}</li>
          <li>Completed At: {iGet('completed_at')}</li>
          <li>Browser Timezone: {iGet('payload.browserTimezone')}</li>
        </ul>
        <ul>
          <li>Title: {iGet('payload.title')}</li>
          <li>Type: {iGet('payload.type')}</li>
          <li>Layout: {iGet('meta.layout')}</li>
          <li>
            Width: {iGet('payload.layout.dimensions.width')} Height:{' '}
            {iGet('payload.layout.dimensions.height')}
          </li>
          <li>Job Type: {iGet('jobtype')}</li>
          <li>Content Type: {iGet('output.content_type')}</li>
        </ul>
        <ul>
          <li>Attempts: {iGet('attempts')}</li>
          <li>Max Attempts: {iGet('max_attempts')}</li>
          <li>Priority: {iGet('priority')}</li>
          <li>Timeout: {iGet('timeout')}</li>
          <li>Status: {iGet('status')}</li>
        </ul>
      </Fragment>
    );
  }

  public render() {
    const button = (
      <EuiButtonIcon
        onClick={this.togglePopover}
        iconType="iInCircle"
        color={'primary'}
        aria-label="Show report info"
      />
    );

    return (
      <EuiPopover
        id="popover"
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        anchorPosition="downRight"
      >
        <EuiCallOut color="primary" title={this.state.calloutTitle}>
          {this.renderInfo()}
        </EuiCallOut>
      </EuiPopover>
    );
  }

  public componentWillUnmount() {
    this.mounted = false;
  }

  public componentDidMount() {
    this.mounted = true;
  }

  private togglePopover = () => {
    this.setState(prevState => {
      return { isPopoverOpen: !prevState.isPopoverOpen };
    });

    if (!this.state.info) {
      this.loadInfo();
    }
  };

  private closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };

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
}
