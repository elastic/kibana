/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
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
  error: Error | null;
}

const NA = 'n/a';

const getDimensions = (info: JobInfo) => {
  const defaultDimensions = { width: null, height: null };
  const { width, height } = get(info, 'payload.layout.dimensions', defaultDimensions);
  if (width && height) {
    return (
      <Fragment>
        Width: {width} x Height: {height}
      </Fragment>
    );
  }
  return NA;
};

export class ReportInfoButton extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      isLoading: false,
      isFlyoutVisible: false,
      calloutTitle: 'Job Info',
      info: null,
      error: null,
    };

    this.closeFlyout = this.closeFlyout.bind(this);
    this.showFlyout = this.showFlyout.bind(this);
  }

  public renderInfo() {
    const { info, error: err } = this.state;
    if (err) {
      return err.message;
    }
    if (!info) {
      return null;
    }

    // TODO browser type
    // TODO queue method (clicked UI, watcher, etc)
    const jobInfoParts = {
      datetimes: [
        {
          title: 'Created By',
          description: get(info, 'created_by', NA),
        },
        {
          title: 'Created At',
          description: get(info, 'created_at', NA),
        },
        {
          title: 'Started At',
          description: get(info, 'started_at', NA),
        },
        {
          title: 'Completed At',
          description: get(info, 'completed_at', NA),
        },
        {
          title: 'Browser Timezone',
          description: get(info, 'payload.browserTimezone', NA),
        },
      ],
      payload: [
        {
          title: 'Title',
          description: get(info, 'payload.title', NA),
        },
        {
          title: 'Type',
          description: get(info, 'payload.type', NA),
        },
        {
          title: 'Layout',
          description: get(info, 'meta.layout', NA),
        },
        {
          title: 'Dimensions',
          description: getDimensions(info),
        },
        {
          title: 'Job Type',
          description: get(info, 'jobtype', NA),
        },
        {
          title: 'Content Type',
          description: get(info, 'output.content_type') || NA,
        },
      ],
      status: [
        {
          title: 'Attempts',
          description: get(info, 'attempts', NA),
        },
        {
          title: 'Max Attempts',
          description: get(info, 'max_attempts', NA),
        },
        {
          title: 'Priority',
          description: get(info, 'priority', NA),
        },
        {
          title: 'Timeout',
          description: get(info, 'timeout', NA),
        },
        {
          title: 'Status',
          description: get(info, 'status', NA),
        },
      ],
    };

    return (
      <Fragment>
        <EuiDescriptionList
          listItems={jobInfoParts.datetimes}
          type="column"
          align="center"
          compressed
        />
        <EuiSpacer size="s" />
        <EuiDescriptionList
          listItems={jobInfoParts.payload}
          type="column"
          align="center"
          compressed
        />
        <EuiSpacer size="s" />
        <EuiDescriptionList
          listItems={jobInfoParts.status}
          type="column"
          align="center"
          compressed
        />
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
          <EuiFlyout
            ownFocus
            onClose={this.closeFlyout}
            size="s"
            aria-labelledby="flyoutTitle"
            data-test-subj="reportInfoFlyout"
          >
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
          data-test-subj="reportInfoButton"
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
          info: null,
          error: kfetchError,
        });
        throw kfetchError;
      }
    }
  };

  private closeFlyout = () => {
    this.setState({
      isFlyoutVisible: false,
      info: null, // force re-read for next click
    });
  };

  private showFlyout = () => {
    this.setState({ isFlyoutVisible: true });

    if (!this.state.info) {
      this.loadInfo();
    }
  };
}
