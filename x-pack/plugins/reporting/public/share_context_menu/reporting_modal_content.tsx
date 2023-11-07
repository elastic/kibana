/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiForm, EuiFormRow, EuiRadioGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { ToastsSetup } from '@kbn/core-notifications-browser';
import { ThemeServiceSetup } from '@kbn/core-theme-browser';
import { IUiSettingsClient } from '@kbn/core/public';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import url from 'url';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React, { FC, ReactElement, useEffect, useRef, useState } from 'react';
import { LayoutType } from '@kbn/screenshotting-plugin/common';
import { LayoutSelectorDictionary } from '@kbn/screenshotting-plugin/common/layout';
import { BaseParams } from '../../common';
import { ReportingAPIClient } from '../lib/reporting_api_client';

export interface ReportingModalProps {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  reportType?: string;
  requiresSavedState: boolean; // Whether the report to be generated requires saved state that is not captured in the URL submitted to the report generator.
  layoutId?: string;
  objectId?: string;

  getJobParams: (forShareUrl?: boolean) => Omit<BaseParams, 'browserTimezone' | 'version'>;

  options?: ReactElement | null;
  isDirty?: boolean;
  onClose?: () => void;
  theme: ThemeServiceSetup;
}

export type Props = ReportingModalProps & { intl: InjectedIntl };

const renderTitle = (
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


export const ReportingModalContentUI: FC<Props> = (props: Props) => {
  const [ , setIsStale] = useState(false);
  // const [layoutId, setLayoutId] = useState('');
  const [objectType, ] = useState(props.getJobParams());
  const [createReportingJob, setCreatingReportJob] = useState(false);
  const [radioIsSelected, setRadioIsSelected] = useState('pdf');
  let [ absoluteUrl, setAbsoluteUrl ] = useState('')
  const mounted = useRef<boolean>();

  const onChange = (label: string) => {
    setRadioIsSelected(label);
  };
  const exportType = radioIsSelected === 'png' ? 'pngV2' : 'printablePdfV2'

  const getAbsoluteReportGenerationUrl = (props: ReportingModalProps) => {
    const relativePath = props.apiClient.getReportingPublicJobPath(
      exportType,
      props.apiClient.getDecoratedJobParams(props.getJobParams())
    );
    return url.resolve(window.location.href, relativePath);
  };

  const setAbsoluteReportGenerationUrl = () => {
    if (!mounted) {
      return;
    }
    absoluteUrl = getAbsoluteReportGenerationUrl(props);
    setAbsoluteUrl(absoluteUrl);
  };

  const markAsStale = () => {
    if (!mounted) return;
    setIsStale(true);
  };

  useEffect(() => {
    setAbsoluteReportGenerationUrl()
    markAsStale()
  })

  // issue generating reports with locator params 
  const generateReportingJob = () => {
    const { intl } = props;
    const decoratedJobParams = props.apiClient.getDecoratedJobParams(props.getJobParams());
    console.log({decoratedJobParams})
    setCreatingReportJob(true);
    return props.apiClient
      .createReportingJob(exportType, decoratedJobParams)
      .then(() => {
        props.toasts.addSuccess({
          title: intl.formatMessage(
            {
              id: 'xpack.reporting.modalContent.successfullyQueuedReportNotificationTitle',
              defaultMessage: 'Queued report for {objectType}',
            },
            { objectType: objectType.objectType }
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
          title: intl.formatMessage({
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
      <EuiText>{renderTitle(objectType)}</EuiText>
      <EuiSpacer size="xs" />
      <EuiRadioGroup
        options={[
          { id: 'pdf', label: 'PDF' },
          { id: 'png', label: 'PNG' },
        ]}
        onChange={(id) => onChange(id)}
        name="image reporting radio group"
      />

      <EuiFormRow
        helpText={
          <FormattedMessage
            id="xpack.reporting.panelContent.saveWorkDescription"
            defaultMessage="Please save your work before generating a report."
          />
        }
      >
        <EuiButton
          disabled={Boolean(createReportingJob)}
          fill
          onClick={() => generateReportingJob()}
          data-test-subj="generateReportButton"
          size="s"
          isLoading={Boolean(createReportingJob)}
        >
          <FormattedMessage
            id="xpack.reporting.panelContent.generateButtonLabel"
            defaultMessage="Generate {reportingType}"
            values={{ reportingType: radioIsSelected }}
          />
        </EuiButton>
      </EuiFormRow>
    </EuiForm>
  );
};

export const ReportingModalContent = injectI18n(ReportingModalContentUI);
