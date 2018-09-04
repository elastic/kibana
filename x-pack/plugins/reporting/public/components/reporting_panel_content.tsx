/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Remove once typescript definitions are in EUI
declare module '@elastic/eui' {
  export const EuiCopy: React.SFC<any>;
  export const EuiForm: React.SFC<any>;
}

import { EuiButton, EuiCopy, EuiForm, EuiFormRow, EuiText } from '@elastic/eui';
import React, { Component } from 'react';
import { KFetchError } from 'ui/kfetch/kfetch_error';
import { toastNotifications } from 'ui/notify';
import url from 'url';
import { reportingClient } from '../lib/reporting_client';

interface Props {
  reportType: string;
  objectId?: string;
  objectType: string;
  getJobParams: () => any;
  options?: any;
  isDirty: boolean;
}

interface State {
  isStale: boolean;
  absoluteUrl?: string;
}

export class ReportingPanelContent extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      isStale: false,
    };
  }

  public componentWillUnmount() {
    window.removeEventListener('hashchange', this.markAsStale);
    window.removeEventListener('resize', this.setAbsoluteReportGenerationUrl);

    this.mounted = false;
  }

  public componentDidMount() {
    this.mounted = true;
    this.setAbsoluteReportGenerationUrl();

    window.addEventListener('hashchange', this.markAsStale, false);
    window.addEventListener('resize', this.setAbsoluteReportGenerationUrl);
  }

  public render() {
    if (this.isNotSaved() || this.props.isDirty || this.state.isStale) {
      return (
        <EuiForm className="sharePanelContent" data-test-subj="shareReportingForm">
          <EuiFormRow helpText="Please save your work before generating a report.">
            <EuiButton disabled>Generate {this.props.reportType}</EuiButton>
          </EuiFormRow>
        </EuiForm>
      );
    }

    const reportMsg = `${this.prettyPrintReportingType()}s can take a minute or two to generate based upon the size of your ${
      this.props.objectType
    }.`;

    return (
      <EuiForm className="sharePanelContent" data-test-subj="shareReportingForm">
        <EuiFormRow>
          <EuiText>
            <p>{reportMsg}</p>
          </EuiText>
        </EuiFormRow>

        {this.props.options}

        <EuiFormRow>
          <EuiButton fill onClick={this.createReportingJob}>
            Generate {this.prettyPrintReportingType()}
          </EuiButton>
        </EuiFormRow>

        <EuiFormRow>
          <EuiText>
            <p>
              Alternatively, copy this POST URL to call generation from outside Kibana or from
              Watcher.
            </p>
          </EuiText>
        </EuiFormRow>

        <EuiCopy textToCopy={this.state.absoluteUrl} anchorClassName="sharePanel__copyAnchor">
          {(copy: () => void) => (
            <EuiFormRow>
              <EuiButton onClick={copy}>Copy POST URL</EuiButton>
            </EuiFormRow>
          )}
        </EuiCopy>
      </EuiForm>
    );
  }

  private prettyPrintReportingType = () => {
    switch (this.props.reportType) {
      case 'printablePdf':
        return 'PDF';
      case 'csv':
        return 'CSV';
      default:
        return this.props.reportType;
    }
  };

  private markAsStale = () => {
    if (!this.mounted) {
      return;
    }

    this.setState({ isStale: true });
  };

  private isNotSaved = () => {
    return this.props.objectId === undefined || this.props.objectId === '';
  };

  private setAbsoluteReportGenerationUrl = () => {
    if (!this.mounted) {
      return;
    }

    const relativePath = reportingClient.getReportingJobPath(
      this.props.reportType,
      this.props.getJobParams()
    );
    const absoluteUrl = url.resolve(window.location.href, relativePath);
    this.setState({ absoluteUrl });
  };

  private createReportingJob = () => {
    return reportingClient
      .createReportingJob(this.props.reportType, this.props.getJobParams())
      .then(() => {
        toastNotifications.addSuccess({
          title: `Queued report for ${this.props.objectType}`,
          text: 'Track its progress in Management',
          'data-test-subj': 'queueReportSuccess',
        });
      })
      .catch((kfetchError: KFetchError) => {
        if (kfetchError.message === 'not exportable') {
          return toastNotifications.addWarning({
            title: 'Only saved dashboards can be exported',
            text: 'Please save your work first',
          });
        }

        const defaultMessage =
          kfetchError.res.status === 403
            ? `You don't have permission to generate this report.`
            : `Can't reach the server. Please try again.`;

        toastNotifications.addDanger({
          title: 'Reporting error',
          text: kfetchError.message || defaultMessage,
          'data-test-subj': 'queueReportError',
        });
      });
  };
}
