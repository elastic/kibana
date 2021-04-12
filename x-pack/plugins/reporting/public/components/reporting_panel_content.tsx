/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCopy, EuiForm, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { Component, ReactElement } from 'react';
import { ToastsSetup } from 'src/core/public';
import url from 'url';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { CSV_REPORT_TYPE, PDF_REPORT_TYPE, PNG_REPORT_TYPE } from '../../common/constants';
import { BaseParams } from '../../common/types';
import { ReportingAPIClient } from '../lib/reporting_api_client';

export interface Props {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  reportType: string;
  layoutId: string | undefined;
  objectId?: string;
  getJobParams: () => BaseParams;
  options?: ReactElement<any>;
  isDirty?: boolean;
  onClose?: () => void;
  intl: InjectedIntl;
}

interface State {
  isStale: boolean;
  absoluteUrl: string;
  layoutId: string;
  objectType: string;
}

class ReportingPanelContentUi extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    // Get objectType from job params
    const { objectType } = props.getJobParams();

    this.state = {
      isStale: false,
      absoluteUrl: this.getAbsoluteReportGenerationUrl(props),
      layoutId: '',
      objectType,
    };
  }

  private getAbsoluteReportGenerationUrl = (props: Props) => {
    const relativePath = this.props.apiClient.getReportingJobPath(
      props.reportType,
      props.getJobParams()
    );
    return url.resolve(window.location.href, relativePath);
  };

  public componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.props.layoutId && this.props.layoutId !== prevState.layoutId) {
      this.setState({
        ...prevState,
        absoluteUrl: this.getAbsoluteReportGenerationUrl(this.props),
        layoutId: this.props.layoutId,
      });
    }
  }

  public componentWillUnmount() {
    window.removeEventListener('hashchange', this.markAsStale);
    window.removeEventListener('resize', this.setAbsoluteReportGenerationUrl);

    this.mounted = false;
  }

  public componentDidMount() {
    this.mounted = true;

    window.addEventListener('hashchange', this.markAsStale, false);
    window.addEventListener('resize', this.setAbsoluteReportGenerationUrl);
  }

  public render() {
    if (this.isNotSaved() || this.props.isDirty || this.state.isStale) {
      return (
        <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
          <EuiFormRow
            helpText={
              <FormattedMessage
                id="xpack.reporting.panelContent.saveWorkDescription"
                defaultMessage="Please save your work before generating a report."
              />
            }
          >
            {this.renderGenerateReportButton(true)}
          </EuiFormRow>
        </EuiForm>
      );
    }

    const reportMsg = (
      <FormattedMessage
        id="xpack.reporting.panelContent.generationTimeDescription"
        defaultMessage="{reportingType}s can take a minute or two to generate based upon the size of your {objectType}."
        description="Here 'reportingType' can be 'PDF' or 'CSV'"
        values={{
          reportingType: this.prettyPrintReportingType(),
          objectType: this.state.objectType,
        }}
      />
    );

    return (
      <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
        <EuiText size="s">
          <p>{reportMsg}</p>
        </EuiText>
        <EuiSpacer size="s" />

        {this.props.options}

        {this.renderGenerateReportButton(false)}
        <EuiSpacer size="s" />

        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.reporting.panelContent.howToCallGenerationDescription"
              defaultMessage="Alternatively, copy this POST URL to call generation from outside Kibana or from Watcher."
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />

        <EuiCopy textToCopy={this.state.absoluteUrl} anchorClassName="eui-displayBlock">
          {(copy) => (
            <EuiButton fullWidth onClick={copy} size="s">
              <FormattedMessage
                id="xpack.reporting.panelContent.copyUrlButtonLabel"
                defaultMessage="Copy POST URL"
              />
            </EuiButton>
          )}
        </EuiCopy>
      </EuiForm>
    );
  }

  private renderGenerateReportButton = (isDisabled: boolean) => {
    return (
      <EuiButton
        disabled={isDisabled}
        fullWidth
        fill
        onClick={this.createReportingJob}
        data-test-subj="generateReportButton"
        size="s"
      >
        <FormattedMessage
          id="xpack.reporting.panelContent.generateButtonLabel"
          defaultMessage="Generate {reportingType}"
          values={{ reportingType: this.prettyPrintReportingType() }}
        />
      </EuiButton>
    );
  };

  private prettyPrintReportingType = () => {
    switch (this.props.reportType) {
      case PDF_REPORT_TYPE:
        return 'PDF';
      case 'csv_searchsource':
        return CSV_REPORT_TYPE;
      case 'png':
        return PNG_REPORT_TYPE;
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
    const absoluteUrl = this.getAbsoluteReportGenerationUrl(this.props);
    this.setState({ absoluteUrl });
  };

  private createReportingJob = () => {
    const { intl } = this.props;

    return this.props.apiClient
      .createReportingJob(this.props.reportType, this.props.getJobParams())
      .then(() => {
        this.props.toasts.addSuccess({
          title: intl.formatMessage(
            {
              id: 'xpack.reporting.panelContent.successfullyQueuedReportNotificationTitle',
              defaultMessage: 'Queued report for {objectType}',
            },
            { objectType: this.state.objectType }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.reporting.panelContent.successfullyQueuedReportNotificationDescription"
              defaultMessage="Track its progress in {path}"
              values={{
                path: (
                  <a href={this.props.apiClient.getManagementLink()}>
                    <FormattedMessage
                      id="xpack.reporting.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
                      defaultMessage="Stack Management &gt; Alerts and Insights &gt; Reporting"
                    />
                  </a>
                ),
              }}
            />
          ),
          'data-test-subj': 'queueReportSuccess',
        });
        if (this.props.onClose) {
          this.props.onClose();
        }
      })
      .catch((error: any) => {
        if (error.message === 'not exportable') {
          return this.props.toasts.addWarning({
            title: intl.formatMessage(
              {
                id: 'xpack.reporting.panelContent.whatCanBeExportedWarningTitle',
                defaultMessage: 'Only saved {objectType} can be exported',
              },
              { objectType: this.state.objectType }
            ),
            text: toMountPoint(
              <FormattedMessage
                id="xpack.reporting.panelContent.whatCanBeExportedWarningDescription"
                defaultMessage="Please save your work first"
              />
            ),
          });
        }

        const defaultMessage =
          error?.res?.status === 403 ? (
            <FormattedMessage
              id="xpack.reporting.panelContent.noPermissionToGenerateReportDescription"
              defaultMessage="You don't have permission to generate this report."
            />
          ) : (
            <FormattedMessage
              id="xpack.reporting.panelContent.notification.cantReachServerDescription"
              defaultMessage="Can't reach the server. Please try again."
            />
          );

        this.props.toasts.addDanger({
          title: intl.formatMessage({
            id: 'xpack.reporting.panelContent.notification.reportingErrorTitle',
            defaultMessage: 'Reporting error',
          }),
          text: toMountPoint(error.message || defaultMessage),
          'data-test-subj': 'queueReportError',
        });
      });
  };
}

export const ReportingPanelContent = injectI18n(ReportingPanelContentUi);
