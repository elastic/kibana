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
import { FormattedMessage, InjectedIntl } from '@kbn/i18n-react';
import url from 'url';
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
                id?: LayoutType | undefined;
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

export const ReportingModalContent: FC<ReportingModalProps> = (props: ReportingModalProps) => {
  const [isStale, setIsStale] = useState(false);
  const [layoutId, setLayoutId] = useState('');
  const [objectType, setObjectType] = useState(props.getJobParams());
  const [createReportingJob, isCreatingReportJob] = useState(false);
  const [radioIsSelected, setRadioIsSelected] = useState('pdf');
  let mounted = useRef<boolean>();

  const onChange = (label: string) => {
    setRadioIsSelected(label);
  };

  const setAbsoluteReportGenerationUrl = () => {
    if (!mounted) {
      return;
    }
    absoluteUrl = getAbsoluteReportGenerationUrl(props);
    setAbsoluteUrl(absoluteUrl)
  };

  const markAsStale = () => {
    if(!mounted) return
    setIsStale(true)
  }

  const getAbsoluteReportGenerationUrl = (props: ReportingModalProps) => {
    const relativePath = props.apiClient.getReportingPublicJobPath(
      radioIsSelected,
      props.apiClient.getDecoratedJobParams(props.getJobParams(true))
    );
    return url.resolve(window.location.href, relativePath);
  };

  useEffect(() => {
    if (!mounted.current) {
      window.addEventListener('hashchange', markAsStale, false);
      window.addEventListener('resize', setAbsoluteReportGenerationUrl);
      mounted.current = true;
    } else {
      // do componentDidUpdate logic
    }
  });
  let [absoluteUrl, setAbsoluteUrl] = useState(getAbsoluteReportGenerationUrl(props));

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
          disabled={Boolean(isCreatingReportJob)}
          fill
          onClick={() => createReportingJob}
          data-test-subj="generateReportButton"
          size="s"
          isLoading={Boolean(isCreatingReportJob)}
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
