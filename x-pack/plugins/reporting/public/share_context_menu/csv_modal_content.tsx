/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiForm, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { ToastsSetup } from '@kbn/core-notifications-browser';
import { ThemeServiceSetup } from '@kbn/core-theme-browser';
import { IUiSettingsClient } from '@kbn/core/public';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import url from 'url';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React, { FC, useRef, useState } from 'react';
import { BaseParams } from '../../common';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { getMaxUrlLength } from './reporting_panel_content/constants';

export interface CsvModalProps {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  reportType?: string;
  requiresSavedState: boolean; // Whether the report to be generated requires saved state that is not captured in the URL submitted to the report generator.
  getJobParams: (forShareUrl?: boolean) => Omit<BaseParams, 'browserTimezone' | 'version'>;
  objectId?: string;
  isDirty?: boolean;
  onClose?: () => void;
  theme: ThemeServiceSetup;
}

export type Props = CsvModalProps & { intl?: InjectedIntl };

const renderDescription = (objectType: string): string => {
  return objectType === 'dashboard'
    ? 'PNG & PDF reports can take a few minutes to generate based upon the size of your dashboard'
    : 'CSV reports can take a few minutes to generate based upon the size of your report';
};

export const CsvModalContentUI: FC<Props> = (props: Props) => {
  const { apiClient, getJobParams, intl, toasts, theme, onClose } = props;
  const [, setIsStale] = useState(false);
  const [createReportingJob, setCreatingReportJob] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const mounted = useRef<boolean>();
  const [objectType] = useState('discover');
  const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();

  const getAbsoluteReportGenerationUrl = () => {
    const relativePath = apiClient.getReportingPublicJobPath(
      'csv_searchsource',
      apiClient.getDecoratedJobParams(getJobParams(true))
    );
    return url.resolve(window.location.href, relativePath);
  };

  const setAbsoluteReportGenerationUrl = () => {
    if (!mounted || !getAbsoluteReportGenerationUrl()) {
      return;
    } else {
      setAbsoluteUrl(getAbsoluteReportGenerationUrl());
    }
  };

  const markAsStale = () => {
    if (!mounted) return;
    setIsStale(true);
  };

  // issue generating reports with locator params
  const generateReportingJob = () => {
    const decoratedJobParams = apiClient.getDecoratedJobParams(getJobParams());
    setCreatingReportJob(true);
    return apiClient
      .createReportingJob('csv_searchsource', decoratedJobParams)
      .then(() => {
        toasts.addSuccess({
          title: intl!.formatMessage(
            {
              id: 'xpack.reporting.modalContent.successfullyQueuedReportNotificationTitle',
              defaultMessage: 'Queued report for discover',
            },
            {}
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.reporting.panelContent.successfullyQueuedReportNotificationDescription"
              defaultMessage="Track its progress in {path}."
              values={{
                path: (
                  <a href={apiClient.getManagementLink()}>
                    <FormattedMessage
                      id="xpack.reporting.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
                      defaultMessage="Stack Management &gt; Reporting"
                    />
                  </a>
                ),
              }}
            />,
            { theme$: theme.theme$ }
          ),
          'data-test-subj': 'queueReportSuccess',
        });
        if (onClose) {
          onClose();
        }
        if (mounted) {
          setCreatingReportJob(false);
        }
      })
      .catch((error) => {
        toasts.addError(error, {
          title: intl!.formatMessage({
            id: 'xpack.reporting.panelContent.notification.reportingErrorTitle',
            defaultMessage: 'Unable to create report',
          }),
          toastMessage: (
            // eslint-disable-next-line react/no-danger
            <span dangerouslySetInnerHTML={{ __html: error.body.message }} />
          ) as unknown as string,
        });
        if (mounted) {
          setCreatingReportJob(false);
        }
      });
  };

  return (
    <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
      <EuiSpacer size="xs" />
      <EuiFormRow>
        <EuiText size="s">{renderDescription(objectType)}</EuiText>
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiButton
        disabled={Boolean(createReportingJob)}
        fill
        onClick={() => generateReportingJob()}
        data-test-subj="generateReportButton"
        size="s"
        isLoading={Boolean(createReportingJob)}
      >
        <EuiSpacer size="xs" />
        <FormattedMessage id="xpack.reporting.generateButtonLabel" defaultMessage="Generate CSV" />
      </EuiButton>
    </EuiForm>
  );
};

// @ts-ignore
export const CsvModalContent = injectI18n(CsvModalContentUI);
