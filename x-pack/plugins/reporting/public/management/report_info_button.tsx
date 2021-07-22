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
import { ListingProps } from '.';

interface Props extends Pick<ListingProps, 'apiClient' | 'intl'> {
  apiClient: ReportingAPIClient;
  job: Job;
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
      calloutTitle: props.intl.formatMessage({
        id: 'xpack.reporting.listing.table.reportCalloutTitle',
        defaultMessage: 'Report info',
      }),
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

    const timeout = info.timeout ? info.timeout.toString() : NA;

    const jobInfo = [
      { title: 'Title', description: info.title || NA },
      { title: 'Created At', description: info.getCreatedAtLabel() },
      { title: 'Status', description: info.getStatus() },
      { title: 'Timezone', description: info.browserTimezone || NA },
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
      { title: 'Attempts', description: info.attempts.toString() },
      { title: 'Max Attempts', description: info.max_attempts?.toString() || NA },
      { title: 'Timeout', description: timeout },
      {
        title: 'Export Type',
        description: info.isDeprecated
          ? this.props.intl.formatMessage(
              {
                id: 'xpack.reporting.listing.table.reportCalloutExportTypeDeprecated',
                defaultMessage: '{jobtype} (DEPRECATED)',
              },
              { jobtype: info.jobtype }
            )
          : info.jobtype,
      },

      // TODO when https://github.com/elastic/kibana/pull/106137 is merged, add kibana version field
    ];

    const jobScreenshot = [
      { title: 'Dimensions', description: getDimensions(info) },
      { title: 'Layout', description: info.layout?.id || UNKNOWN },
      { title: 'Browser Type', description: info.browser_type || NA },
    ];

    const warnings = info.getWarnings();
    const warningsInfo = warnings && [
      {
        title: <EuiText color="danger">Warnings</EuiText>,
        description: <EuiText color="warning">{warnings}</EuiText>,
      },
    ];

    const errored = info.getError();
    const errorInfo = errored && [
      {
        title: <EuiText color="danger">Error</EuiText>,
        description: <EuiText color="danger">{errored}</EuiText>,
      },
    ];

    return (
      <>
        <EuiDescriptionList listItems={jobInfo} type="column" align="center" compressed />
        <EuiSpacer size="s" />
        <EuiDescriptionList listItems={processingInfo} type="column" align="center" compressed />
        {USES_HEADLESS_JOB_TYPES.includes(info.jobtype) ? (
          <>
            <EuiSpacer size="s" />
            <EuiDescriptionList listItems={jobScreenshot} type="column" align="center" compressed />
          </>
        ) : null}
        {warningsInfo ? (
          <>
            <EuiSpacer size="s" />
            <EuiDescriptionList listItems={warningsInfo} type="column" align="center" compressed />
          </>
        ) : null}
        {errorInfo ? (
          <>
            <EuiSpacer size="s" />
            <EuiDescriptionList listItems={errorInfo} type="column" align="center" compressed />
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
    const job = this.props.job;
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

    let message = this.props.intl.formatMessage({
      id: 'xpack.reporting.listing.table.reportInfoButtonTooltip',
      defaultMessage: 'See report info',
    });
    if (job.getError()) {
      message = this.props.intl.formatMessage({
        id: 'xpack.reporting.listing.table.reportInfoAndErrorButtonTooltip',
        defaultMessage: 'See report info and error message',
      });
    } else if (job.getWarnings()) {
      message = this.props.intl.formatMessage({
        id: 'xpack.reporting.listing.table.reportInfoAndWarningsButtonTooltip',
        defaultMessage: 'See report info and warnings',
      });
    }

    let buttonIconType = 'iInCircle';
    let buttonColor: 'primary' | 'danger' | 'warning' = 'primary';
    if (job.getWarnings() || job.getError()) {
      buttonIconType = 'alert';
      buttonColor = 'danger';
    }
    if (job.getWarnings()) {
      buttonColor = 'warning';
    }

    return (
      <>
        <EuiToolTip position="top" content={message}>
          <EuiButtonIcon
            onClick={this.showFlyout}
            iconType={buttonIconType}
            color={buttonColor}
            data-test-subj="reportInfoButton"
            aria-label={this.props.intl.formatMessage({
              id: 'xpack.reporting.listing.table.showReportInfoAriaLabel',
              defaultMessage: 'Show report info',
            })}
          />
        </EuiToolTip>
        {flyout}
      </>
    );
  }

  private loadInfo = async () => {
    this.setState({ isLoading: true });
    try {
      const info = await this.props.apiClient.getInfo(this.props.job.id);
      if (this.mounted) {
        this.setState({ isLoading: false, info });
      }
    } catch (err) {
      if (this.mounted) {
        this.setState({
          isLoading: false,
          calloutTitle: this.props.intl.formatMessage({
            id: 'xpack.reporting.listing.table.reportInfoUnableToFetch',
            defaultMessage: 'Unable to fetch report info',
          }),
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
