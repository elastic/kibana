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
  EuiToolTip,
} from '@elastic/eui';
import { injectI18n } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { USES_HEADLESS_JOB_TYPES } from '../../common/constants';
import { Job } from '../lib/job';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { Props as ListingProps } from './report_listing';

interface Props extends Pick<ListingProps, 'apiClient' | 'intl'> {
  jobId: string;
  apiClient: ReportingAPIClient;
}

interface State {
  isLoading: boolean;
  isFlyoutVisible: boolean;
  calloutTitle: string;
  info: Job | null;
  error: Error | null;
}

const NA = 'n/a';
const UNKNOWN = 'unknown';

const getDimensions = (info: Job): string => {
  const defaultDimensions = { width: null, height: null };
  const { width, height } = info.layout?.dimensions || defaultDimensions;
  if (width && height) {
    return `Width: ${width} x Height: ${height}`;
  }
  return UNKNOWN;
};

class ReportInfoButtonUi extends Component<Props, State> {
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
    const attempts = info.attempts ? info.attempts.toString() : NA;
    const maxAttempts = info.max_attempts ? info.max_attempts.toString() : NA;
    const timeout = info.timeout ? info.timeout.toString() : NA;
    const warnings = info.warnings?.join(',') ?? null;

    const jobInfo = [
      { title: 'Title', description: info.title || NA },
      { title: 'Created By', description: info.created_by || NA },
      { title: 'Created At', description: info.created_at || NA },
      { title: 'Timezone', description: info.browserTimezone || NA },
      { title: 'Status', description: info.status || NA },
    ];

    const processingInfo = [
      { title: 'Started At', description: info.started_at || NA },
      { title: 'Completed At', description: info.completed_at || NA },
      {
        title: 'Processed By',
        description:
          info.kibana_name && info.kibana_id ? `${info.kibana_name} (${info.kibana_id})` : NA,
      },
      { title: 'Content Type', description: info.content_type || NA },
      { title: 'Size in Bytes', description: info.size?.toString() || NA },
      { title: 'Attempts', description: attempts },
      { title: 'Max Attempts', description: maxAttempts },
      { title: 'Timeout', description: timeout },
    ];

    const jobScreenshot = [
      { title: 'Dimensions', description: getDimensions(info) },
      { title: 'Layout', description: info.layout?.id || UNKNOWN },
      { title: 'Browser Type', description: info.browser_type || NA },
    ];

    const warningInfo = warnings && [{ title: 'Errors', description: warnings }];

    return (
      <>
        <EuiDescriptionList listItems={jobInfo} type="column" align="center" compressed />
        <EuiSpacer size="s" />
        <EuiDescriptionList listItems={processingInfo} type="column" align="center" compressed />
        {USES_HEADLESS_JOB_TYPES.includes(jobType) ? (
          <>
            <EuiSpacer size="s" />
            <EuiDescriptionList listItems={jobScreenshot} type="column" align="center" compressed />
          </>
        ) : null}
        {warningInfo ? (
          <>
            <EuiSpacer size="s" />
            <EuiDescriptionList listItems={warningInfo} type="column" align="center" compressed />
          </>
        ) : null}
      </>
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
      <>
        <EuiToolTip
          position="top"
          content={this.props.intl.formatMessage({
            id: 'xpack.reporting.listing.table.reportInfo',
            defaultMessage: 'Job info',
          })}
        >
          <EuiButtonIcon
            onClick={this.showFlyout}
            iconType="iInCircle"
            color={'primary'}
            data-test-subj="reportInfoButton"
            aria-label="Show report info"
          />
        </EuiToolTip>
        {flyout}
      </>
    );
  }

  private loadInfo = async () => {
    this.setState({ isLoading: true });
    try {
      const info = await this.props.apiClient.getInfo(this.props.jobId);
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

export const ReportInfoButton = injectI18n(ReportInfoButtonUi);
