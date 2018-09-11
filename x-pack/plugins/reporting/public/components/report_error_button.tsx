/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import React, { Component } from 'react';
import { jobQueueClient } from '../lib/job_queue_client';

interface Props {
  jobId: string;
}

interface State {
  isLoading: boolean;
  calloutTitle: string;
  error?: string;
}

export class ReportErrorButton extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      isLoading: false,
      calloutTitle: 'Unable to generate report',
    };
  }

  public render() {
    if (this.state.error) {
      return (
        <EuiCallOut color="danger" title={this.state.calloutTitle}>
          <p>{this.state.error}</p>
        </EuiCallOut>
      );
    }

    if (this.state.isLoading) {
      return <EuiLoadingSpinner size="m" />;
    }

    return (
      <EuiButtonIcon
        onClick={() => this.loadError()}
        iconType="alert"
        color={'danger'}
        aria-label="Show report error"
      />
    );
  }

  public componentWillUnmount() {
    this.mounted = false;
  }

  public componentDidMount() {
    this.mounted = true;
  }

  private loadError = async () => {
    this.setState({ isLoading: true });
    let reportContent;
    try {
      reportContent = await jobQueueClient.getContent(this.props.jobId);
    } catch (kfetchError) {
      if (this.mounted) {
        this.setState({
          isLoading: false,
          calloutTitle: 'Unable to fetch report content',
          error: kfetchError.message,
        });
      }
    }

    if (this.mounted) {
      this.setState({ isLoading: false, error: reportContent.content });
    }
  };
}
