/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiCallOut, EuiPopover } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { JobStatuses } from '../../../constants';
import { JobContent, ReportingAPIClient } from '../../lib/reporting_api_client';
import { Job as ListingJob } from '../report_listing';

interface Props {
  intl: InjectedIntl;
  apiClient: ReportingAPIClient;
  record: ListingJob;
}

interface State {
  isLoading: boolean;
  isPopoverOpen: boolean;
  calloutTitle: string;
  error?: string;
}

class ReportErrorButtonUi extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      isLoading: false,
      isPopoverOpen: false,
      calloutTitle: props.intl.formatMessage({
        id: 'xpack.reporting.errorButton.unableToGenerateReportTitle',
        defaultMessage: 'Unable to generate report',
      }),
    };
  }

  public render() {
    const { record, intl } = this.props;

    if (record.status !== JobStatuses.FAILED) {
      return null;
    }

    const button = (
      <EuiButtonIcon
        onClick={this.togglePopover}
        iconType="alert"
        color={'danger'}
        aria-label={intl.formatMessage({
          id: 'xpack.reporting.errorButton.showReportErrorAriaLabel',
          defaultMessage: 'Show report error',
        })}
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
        <EuiCallOut color="danger" title={this.state.calloutTitle}>
          <p>{this.state.error}</p>
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
    this.setState((prevState) => {
      return { isPopoverOpen: !prevState.isPopoverOpen };
    });

    if (!this.state.error) {
      this.loadError();
    }
  };

  private closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };

  private loadError = async () => {
    const { record, apiClient, intl } = this.props;

    this.setState({ isLoading: true });
    try {
      const reportContent: JobContent = await apiClient.getContent(record.id);
      if (this.mounted) {
        this.setState({ isLoading: false, error: reportContent.content });
      }
    } catch (kfetchError) {
      if (this.mounted) {
        this.setState({
          isLoading: false,
          calloutTitle: intl.formatMessage({
            id: 'xpack.reporting.errorButton.unableToFetchReportContentTitle',
            defaultMessage: 'Unable to fetch report content',
          }),
          error: kfetchError.message,
        });
      }
    }
  };
}

export const ReportErrorButton = injectI18n(ReportErrorButtonUi);
