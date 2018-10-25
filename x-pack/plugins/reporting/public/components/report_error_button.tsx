/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiCallOut, EuiPopover } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { Component } from 'react';
import { JobContent, jobQueueClient } from '../lib/job_queue_client';

interface Props {
  jobId: string;
  intl: InjectedIntl;
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
    const button = (
      <EuiButtonIcon
        onClick={this.togglePopover}
        iconType="alert"
        color={'danger'}
        aria-label={this.props.intl.formatMessage({
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
    this.setState(prevState => {
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
    this.setState({ isLoading: true });
    try {
      const reportContent: JobContent = await jobQueueClient.getContent(this.props.jobId);
      if (this.mounted) {
        this.setState({ isLoading: false, error: reportContent.content });
      }
    } catch (kfetchError) {
      if (this.mounted) {
        this.setState({
          isLoading: false,
          calloutTitle: this.props.intl.formatMessage({
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
