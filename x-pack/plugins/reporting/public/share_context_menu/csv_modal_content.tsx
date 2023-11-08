/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
    EuiButton,
    EuiForm,
    EuiSpacer,
    EuiText,
  } from '@elastic/eui';
  import { ToastsSetup } from '@kbn/core-notifications-browser';
  import { ThemeServiceSetup } from '@kbn/core-theme-browser';
  import { IUiSettingsClient } from '@kbn/core/public';
  import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
  import url from 'url';
  import { toMountPoint } from '@kbn/kibana-react-plugin/public';
  import React, { FC, useEffect, useRef, useState } from 'react';
  import { LayoutType } from '@kbn/screenshotting-plugin/common';
  import type {
    LayoutSelectorDictionary,
  } from '@kbn/screenshotting-plugin/common/layout';
  import { ReportingAPIClient } from '../lib/reporting_api_client';
import { BaseParams } from '@kbn/reporting-plugin/common';
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
  
  const renderDescription = (
    objectType:
      | string
      | Omit<
          {
            layout?:
              | {
                  id?: LayoutType;
                  dimensions?: { width: number; height: number } | undefined;
                  selectors?: Partial<LayoutSelectorDictionary> | undefined;
                  zoom?: number | undefined;
                }
              | undefined;
            objectType: string;
            title: string;
            browserTimezone: string;
            version: string;
          },
          'browserTimezone' | 'version'
        >
  ) => {
    return objectType === 'dashboard'
      ? 'PNG & PDF reports can take a few minutes to generate based upon the size of your dashboard'
      : 'CSV reports can take a few minutes to generate based upon the size of your report';
  };
  

  export const CsvModalContentUI: FC<Props> = (props: Props) => {
    const { apiClient, getJobParams } = props;
    const [, setIsStale] = useState(false);
    const [createReportingJob, setCreatingReportJob] = useState(false);
    let [absoluteUrl, setAbsoluteUrl] = useState('');
    const mounted = useRef<boolean>();
    const [objectType,] = useState('discover');
    const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();

    
  
    const getAbsoluteReportGenerationUrl = (props: CsvModalProps) => {
      const relativePath = apiClient.getReportingPublicJobPath(
        'csv_searchsource',
        props.apiClient.getDecoratedJobParams(getJobParams(true)
        )
      );
      return url.resolve(window.location.href, relativePath);
      }
  
    const setAbsoluteReportGenerationUrl = () => {
      if (!mounted || !getAbsoluteReportGenerationUrl(props)) {
        return;
      } else {
        absoluteUrl = getAbsoluteReportGenerationUrl(props)!;
        setAbsoluteUrl(absoluteUrl);
      }
      
    };
  
    const markAsStale = () => {
      if (!mounted) return;
      setIsStale(true);
    };
  
    useEffect(() => {
      setAbsoluteReportGenerationUrl();
      markAsStale();
    });

  
    // issue generating reports with locator params
    const generateReportingJob = () => {
      const { intl } = props;
      const decoratedJobParams = props.apiClient.getDecoratedJobParams(getJobParams());
      setCreatingReportJob(true);
      return props.apiClient
        .createReportingJob('csv_searchsource', decoratedJobParams)
        .then(() => {
          props.toasts.addSuccess({
            title: intl!.formatMessage(
              {
                id: 'xpack.reporting.modalContent.successfullyQueuedReportNotificationTitle',
                defaultMessage: 'Queued report for discover',
              },
              {  }
            ),
            text: toMountPoint(
              <FormattedMessage
                id="xpack.reporting.panelContent.successfullyQueuedReportNotificationDescription"
                defaultMessage="Track its progress in {path}."
                values={{
                  path: (
                    <a href={props.apiClient.getManagementLink()}>
                      <FormattedMessage
                        id="xpack.reporting.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
                        defaultMessage="Stack Management &gt; Reporting"
                      />
                    </a>
                  ),
                }}
              />,
              { theme$: props.theme.theme$ }
            ),
            'data-test-subj': 'queueReportSuccess',
          });
          if (props.onClose) {
            props.onClose();
          }
          if (mounted) {
            setCreatingReportJob(false);
          }
        })
        .catch((error) => {
          props.toasts.addError(error, {
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
        <EuiText>{renderDescription(objectType)}</EuiText>
        <EuiSpacer size="xs" />
          <EuiButton
            disabled={Boolean(createReportingJob)}
            fill
            onClick={() => generateReportingJob()}
            data-test-subj="generateReportButton"
            size="s"
            isLoading={Boolean(createReportingJob)}
          >
            <EuiSpacer size="xs" />
            <FormattedMessage
              id="xpack.reporting.generateButtonLabel"
              defaultMessage="Generate CSV"
            />
          </EuiButton>
      </EuiForm>
    );
  };
  
  // @ts-ignore
  export const CsvModalContent = injectI18n(CsvModalContentUI);
  