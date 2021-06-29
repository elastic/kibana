/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { USES_HEADLESS_JOB_TYPES } from '../../common/constants';
import { ReportApiJSON } from '../../common/types';
import { ReportingAPIClient } from '../lib/reporting_api_client';

interface Props {
  jobId: string;
  apiClient: ReportingAPIClient;
}

interface State {
  isLoading: boolean;
  isFlyoutVisible: boolean;
  calloutTitle: string;
  info: ReportApiJSON | null;
  error: Error | null;
}

const NA = 'n/a';
const UNKNOWN = 'unknown';

const getDimensions = (info: ReportApiJSON): string => {
  const defaultDimensions = { width: null, height: null };
  const { width, height } = get(info, 'payload.layout.dimensions', defaultDimensions);
  if (width && height) {
    return `Width: ${width} x Height: ${height}`;
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

    const jobType = info.jobtype || NA;

    interface JobInfo {
      title: string;
      description: string;
    }

    interface JobInfoMap {
      [thing: string]: JobInfo[];
    }

    const attempts = info.attempts ? info.attempts.toString() : NA;
    const maxAttempts = info.max_attempts ? info.max_attempts.toString() : NA;
    const timeout = info.timeout ? info.timeout.toString() : NA;
    const warnings = info.output && info.output.warnings ? info.output.warnings.join(',') : null;

    const jobInfoDateTimes: JobInfo[] = [
      {
        title: 'Created By',
        description: info.created_by || NA,
      },
      {
        title: 'Created At',
        description: info.created_at || NA,
      },
      {
        title: 'Started At',
        description: info.started_at || NA,
      },
      {
        title: 'Completed At',
        description: info.completed_at || NA,
      },
      {
        title: 'Processed By',
        description:
          info.kibana_name && info.kibana_id ? `${info.kibana_name} (${info.kibana_id})` : UNKNOWN,
      },
      {
        title: 'Browser Timezone',
        description: get(info, 'payload.browserTimezone') || NA,
      },
    ];
    const jobInfoPayload: JobInfo[] = [
      {
        title: 'Title',
        description: get(info, 'payload.title') || NA,
      },
      {
        title: 'Layout',
        description: get(info, 'meta.layout') || NA,
      },
      {
        title: 'Dimensions',
        description: getDimensions(info),
      },
      {
        title: 'Job Type',
        description: jobType,
      },
      {
        title: 'Content Type',
        description: get(info, 'output.content_type') || NA,
      },
      {
        title: 'Size in Bytes',
        description: get(info, 'output.size') || NA,
      },
    ];
    const jobInfoStatus: JobInfo[] = [
      {
        title: 'Attempts',
        description: attempts,
      },
      {
        title: 'Max Attempts',
        description: maxAttempts,
      },
      {
        title: 'Timeout',
        description: timeout,
      },
      {
        title: 'Status',
        description: info.status || NA,
      },
      {
        title: 'Browser Type',
        description: USES_HEADLESS_JOB_TYPES.includes(jobType) ? info.browser_type || UNKNOWN : NA,
      },
    ];

    if (warnings) {
      jobInfoStatus.push({
        title: 'Errors',
        description: warnings,
      });
    }

    const jobInfoParts: JobInfoMap = {
      datetimes: jobInfoDateTimes,
      payload: jobInfoPayload,
      status: jobInfoStatus,
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
              <EuiTitle size="m">
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
      const info: ReportApiJSON = await this.props.apiClient.getInfo(this.props.jobId);
      if (this.mounted) {
        this.setState({ isLoading: false, info });
      }
    } catch (err) {
      if (this.mounted) {
        this.setState({
          isLoading: false,
          calloutTitle: 'Unable to fetch report info',
          info: null,
          error: err,
        });
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
