/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiCopy, EuiForm, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { Component, ReactElement } from 'react';
import { ToastsSetup } from 'src/core/public';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';

interface Props {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  reportType: string;
  layoutId: string | undefined;
  objectId?: string;
  objectType: string;
  getJobParams: () => any;
  options?: ReactElement<any>;
  isDirty: boolean;
  onClose: () => void;
  intl: InjectedIntl;
}

interface State {
  isStale: boolean;
  curlParams: {
    url: string;
    payload: string;
  };
  layoutId: string;
}

class ReportingPanelContentUi extends Component<Props, State> {
  private mounted?: boolean;

  constructor(props: Props) {
    super(props);

    this.state = {
      isStale: false,
      curlParams: this.getReportGenerationCurl(props),
      layoutId: '',
    };
  }
  /*
    curl --request POST 'http://u:p@localhost:5601/api/reporting/generate/printablePdf' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "jobParams": "(browserTimezone:America/Los_Angeles,layout:(dimensions:(height:2024,width:1440),id:preserve_layout),objectType:dashboard,relativeUrls:!('\''/app/dashboards#/view/722b74f0-b882-11e8-a6d9-e546fe2bba5f?_g=(filters:!!(),refreshInterval:(pause:!!f,value:900000),time:(from:now-7d,to:now))&_a=(description:!'\''Analyze%20mock%20eCommerce%20orders%20and%20revenue!'\'',filters:!!(),fullScreenMode:!!f,options:(hidePanelTitles:!!f,useMargins:!!t),query:(language:kuery,query:!'\''!'\''),timeRestore:!!t,title:!'\''%5BeCommerce%5D%20Revenue%20Dashboard!'\'',viewMode:view)'\''),title:'\''[eCommerce] Revenue Dashboard'\'')"
  }'
  */

  private getReportGenerationCurl = (props: Props) => {
    const { url, payload } = this.props.apiClient.getReportingJobPath(
      props.reportType,
      props.getJobParams()
    );

    return { url, payload };
  };

  public componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.props.layoutId && this.props.layoutId !== prevState.layoutId) {
      this.setState({
        ...prevState,
        curlParams: this.getReportGenerationCurl(this.props),
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
          objectType: this.props.objectType,
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

        <EuiCopy
          textToCopy={`curl -X POST --header "Content-Type: application/json" --data-raw ${this.state.curlParams.payload} ${this.state.curlParams.url}`}
          anchorClassName="eui-displayBlock"
        >
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
      case 'printablePdf':
        return 'PDF';
      case 'csv':
        return 'CSV';
      case 'png':
        return 'PNG';
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
    const curlParams = this.getReportGenerationCurl(this.props);
    this.setState({ curlParams });
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
            { objectType: this.props.objectType }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.reporting.panelContent.successfullyQueuedReportNotificationDescription"
              defaultMessage="Track its progress in Management"
            />
          ),
          'data-test-subj': 'queueReportSuccess',
        });
        this.props.onClose();
      })
      .catch((error: any) => {
        if (error.message === 'not exportable') {
          return this.props.toasts.addWarning({
            title: intl.formatMessage(
              {
                id: 'xpack.reporting.panelContent.whatCanBeExportedWarningTitle',
                defaultMessage: 'Only saved {objectType} can be exported',
              },
              { objectType: this.props.objectType }
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
