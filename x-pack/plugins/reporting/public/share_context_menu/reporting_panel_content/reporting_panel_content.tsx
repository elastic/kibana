/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiCopy,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import React, { Component, ReactElement } from 'react';
import { IUiSettingsClient, ThemeServiceSetup, ToastsSetup } from 'src/core/public';
import url from 'url';
import { toMountPoint } from '../../../../../../src/plugins/kibana_react/public';
import {
  CSV_REPORT_TYPE,
  PDF_REPORT_TYPE,
  PDF_REPORT_TYPE_V2,
  PNG_REPORT_TYPE,
  PNG_REPORT_TYPE_V2,
} from '../../../common/constants';
import { BaseParams } from '../../../common/types';
import { ReportingAPIClient } from '../../lib/reporting_api_client';
import { ErrorUnsavedWorkPanel, ErrorUrlTooLongPanel } from './components';
import { getMaxUrlLength } from './constants';

/**
 * Properties for displaying a share menu with Reporting features, including
 * internally-derived fields.
 */
export interface ReportingPanelProps {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  reportType: string;

  requiresSavedState: boolean; // Whether the report to be generated requires saved state that is not captured in the URL submitted to the report generator.
  layoutId?: string;
  objectId?: string;

  getJobParams: (forShareUrl?: boolean) => Omit<BaseParams, 'browserTimezone' | 'version'>;

  options?: ReactElement | null;
  isDirty?: boolean;
  onClose?: () => void;
  theme: ThemeServiceSetup;
}

export type Props = ReportingPanelProps & { intl: InjectedIntl };

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
      this.props.apiClient.getDecoratedJobParams(this.props.getJobParams(true))
    );
    return url.resolve(window.location.href, relativePath); // FIXME: '(from: string, to: string): string' is deprecated
  };

  public componentDidUpdate(_prevProps: Props, prevState: State) {
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

  private isNotSaved = () => {
    return this.props.objectId === undefined || this.props.objectId === '';
  };

  private renderCopyURLButton({
    isUnsaved,
    exceedsMaxLength,
  }: {
    isUnsaved: boolean;
    exceedsMaxLength: boolean;
  }) {
    if (isUnsaved) {
      if (exceedsMaxLength) {
        return <ErrorUrlTooLongPanel isUnsaved />;
      }
      return <ErrorUnsavedWorkPanel />;
    } else if (exceedsMaxLength) {
      return <ErrorUrlTooLongPanel isUnsaved={false} />;
    }
    return (
      <EuiCopy textToCopy={this.state.absoluteUrl} anchorClassName="eui-displayBlock">
        {(copy) => (
          <EuiButton color={isUnsaved ? 'warning' : 'primary'} fullWidth onClick={copy} size="s">
            <FormattedMessage
              id="xpack.reporting.panelContent.copyUrlButtonLabel"
              defaultMessage="Copy POST URL"
            />
          </EuiButton>
        )}
      </EuiCopy>
    );
  }

  public render() {
    const isUnsaved: boolean = this.isNotSaved() || this.props.isDirty || this.state.isStale;

    if (this.props.requiresSavedState && isUnsaved) {
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

    const exceedsMaxLength = this.state.absoluteUrl.length >= getMaxUrlLength();

    return (
      <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.reporting.panelContent.generationTimeDescription"
              defaultMessage="{reportingType}s can take a minute or two to generate based upon the size of your {objectType}."
              description="Here 'reportingType' can be 'PDF' or 'CSV'"
              values={{
                reportingType: this.prettyPrintReportingType(),
                objectType: this.state.objectType,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />

        {this.props.options}

        {this.renderGenerateReportButton(false)}

        <EuiHorizontalRule
          margin="s"
          style={{ width: 'auto', marginLeft: '-16px', marginRight: '-16px' }}
        />

        <EuiAccordion
          id="advanced-options"
          buttonContent={i18n.translate('xpack.reporting.panelContent.advancedOptions', {
            defaultMessage: 'Advanced options',
          })}
          paddingSize="none"
        >
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
          {this.renderCopyURLButton({ isUnsaved, exceedsMaxLength })}
        </EuiAccordion>
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
      case PDF_REPORT_TYPE_V2:
        return 'PDF';
      case 'csv_searchsource':
        return CSV_REPORT_TYPE;
      case 'png':
      case PNG_REPORT_TYPE_V2:
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

  private setAbsoluteReportGenerationUrl = () => {
    if (!this.mounted) {
      return;
    }
    const absoluteUrl = this.getAbsoluteReportGenerationUrl(this.props);
    this.setState({ absoluteUrl });
  };

  private createReportingJob = () => {
    const { intl } = this.props;
    const decoratedJobParams = this.props.apiClient.getDecoratedJobParams(
      this.props.getJobParams()
    );

    return this.props.apiClient
      .createReportingJob(this.props.reportType, decoratedJobParams)
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
              defaultMessage="Track its progress in {path}."
              values={{
                path: (
                  <a href={this.props.apiClient.getManagementLink()}>
                    <FormattedMessage
                      id="xpack.reporting.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
                      defaultMessage="Stack Management &gt; Reporting"
                    />
                  </a>
                ),
              }}
            />,
            { theme$: this.props.theme.theme$ }
          ),
          'data-test-subj': 'queueReportSuccess',
        });
        if (this.props.onClose) {
          this.props.onClose();
        }
      })
      .catch((error) => {
        this.props.toasts.addError(error, {
          title: intl.formatMessage({
            id: 'xpack.reporting.panelContent.notification.reportingErrorTitle',
            defaultMessage: 'Failed to create report',
          }),
          toastMessage: error.body.message,
        });
      });
  };
}

export const ReportingPanelContent = injectI18n(ReportingPanelContentUi);
