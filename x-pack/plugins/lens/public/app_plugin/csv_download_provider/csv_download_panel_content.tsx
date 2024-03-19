/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiForm,
  EuiFormRow,
  EuiModalFooter,
  EuiRadioGroup,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import type { IUiSettingsClient, ThemeServiceSetup, ToastsSetup } from '@kbn/core/public';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import url from 'url';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React, { FC, useCallback, useEffect, useState, useMemo } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { LayoutParams } from '@kbn/screenshotting-plugin/common';
import { BaseParams } from '@kbn/reporting-common/types';
import { ReportingAPIClient } from '@kbn/reporting-public';
import {
  ErrorUnsavedWorkPanel,
  ErrorUrlTooLongPanel,
} from '@kbn/reporting-public/share/share_context_menu/reporting_panel_content/components';
import { JobAppParamsPDFV2 } from '@kbn/reporting-export-types-pdf-common';

interface ReportingSharingData {
  title: string;
  layout: LayoutParams;
  reportingDisabled?: boolean;
  [key: string]: unknown;
}
const CHROMIUM_MAX_URL_LENGTH = 25 * 1000;
const getMaxUrlLength = () => CHROMIUM_MAX_URL_LENGTH;

interface JobParamsProviderOptions {
  sharingData: ReportingSharingData;
  shareableUrl: string;
  objectType: string;
}
export interface ReportingModalProps {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  reportType?: string;
  requiresSavedState: boolean; // Whether the report to be generated requires saved state that is not captured in the URL submitted to the report generator.
  objectId?: string;
  isDirty?: boolean;
  onClose: () => void;
  onClick: () => void;
  theme: ThemeServiceSetup;
  jobProviderOptions?: JobParamsProviderOptions;
  getJobParams?: JobAppParamsPDFV2;
  objectType: string;
  isDisabled: boolean;
  warnings: string[];
}

type AppParams = Omit<BaseParams, 'browserTimezone' | 'version'>;

export type Props = ReportingModalProps & { intl: InjectedIntl };

type AllowedImageExportType = 'pngV2' | 'printablePdfV2' | 'printablePdf' | 'csv';

export const ReportingModalContentUI: FC<Props> = (props: Props) => {
  const {
    apiClient,
    intl,
    toasts,
    theme,
    onClose,
    objectId,
    jobProviderOptions,
    objectType,
    isDisabled,
  } = props;
  const isSaved = Boolean(objectId);
  const [isStale, setIsStale] = useState(false);
  const [createReportingJob, setCreatingReportJob] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState<AllowedImageExportType>('printablePdfV2');
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const isMounted = useMountedState();
  const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();

  const getJobsParams = useCallback(
    (type: AllowedImageExportType, opts?: JobParamsProviderOptions) => {
      if (!opts) {
        return { ...props.getJobParams };
      }

      const {
        sharingData: { title, layout, locatorParams },
      } = opts;

      const baseParams = {
        objectType,
        layout,
        title,
      };
      if (type === 'csv') {
        return {
          title,
          objectType,
          locatorParams,
        };
      }

      if (type === 'printablePdfV2') {
        // multi locator for PDF V2
        return { ...baseParams, locatorParams: [locatorParams] };
      } else if (type === 'pngV2') {
        // single locator for PNG V2
        return { ...baseParams, locatorParams };
      }

      // Relative URL must have URL prefix (Spaces ID prefix), but not server basePath
      // Replace hashes with original RISON values.
      const relativeUrl = opts?.shareableUrl.replace(
        window.location.origin + apiClient.getServerBasePath(),
        ''
      );

      if (type === 'printablePdf') {
        // multi URL for PDF
        return { ...baseParams, relativeUrls: [relativeUrl] };
      }

      // single URL for PNG
      return { ...baseParams, relativeUrl };
    },
    [apiClient, props.getJobParams, objectType]
  );

  const getJobParams = useCallback(
    (shareableUrl?: boolean) => {
      return { ...getJobsParams(selectedRadio, jobProviderOptions) };
    },
    [getJobsParams, jobProviderOptions, selectedRadio]
  );

  const getAbsoluteReportGenerationUrl = useMemo(
    () => () => {
      if (getJobsParams(selectedRadio, jobProviderOptions) !== undefined) {
        const relativePath = apiClient.getReportingPublicJobPath(
          selectedRadio,
          apiClient.getDecoratedJobParams(getJobParams(true) as unknown as AppParams)
        );
        return setAbsoluteUrl(url.resolve(window.location.href, relativePath));
      }
    },
    [apiClient, getJobParams, selectedRadio, getJobsParams, jobProviderOptions]
  );

  const markAsStale = useCallback(() => {
    if (!isMounted) return;
    setIsStale(true);
  }, [isMounted]);

  useEffect(() => {
    getAbsoluteReportGenerationUrl();
    markAsStale();
  }, [markAsStale, getAbsoluteReportGenerationUrl]);

  const generateReportingJob = () => {
    const decoratedJobParams = apiClient.getDecoratedJobParams(
      getJobParams(false) as unknown as AppParams
    );
    setCreatingReportJob(true);
    return apiClient
      .createReportingJob(selectedRadio, decoratedJobParams)
      .then(() => {
        toasts.addSuccess({
          title: intl.formatMessage(
            {
              id: 'xpack.reporting.modalContent.successfullyQueuedReportNotificationTitle',
              defaultMessage: 'Queued report for {objectType}',
            },
            { objectType }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.reporting.modalContent.successfullyQueuedReportNotificationDescription"
              defaultMessage="Track its progress in {path}."
              values={{
                path: (
                  <a href={apiClient.getManagementLink()}>
                    <FormattedMessage
                      id="xpack.reporting.modalContent.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
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
        if (isMounted()) {
          setCreatingReportJob(false);
        }
      })
      .catch((error) => {
        toasts.addError(error, {
          title: intl!.formatMessage({
            id: 'xpack.reporting.modalContent.notification.reportingErrorTitle',
            defaultMessage: 'Unable to create report',
          }),
          toastMessage: (
            // eslint-disable-next-line react/no-danger
            <span dangerouslySetInnerHTML={{ __html: error.body.message }} />
          ) as unknown as string,
        });
        if (isMounted()) {
          setCreatingReportJob(false);
        }
      });
  };

  const renderCopyURLButton = ({
    isUnsaved,
  }: {
    isUnsaved: boolean;
    exceedsMaxLength: boolean;
  }) => {
    if (isUnsaved) {
      if (exceedsMaxLength) {
        return <ErrorUrlTooLongPanel isUnsaved />;
      }
      return <ErrorUnsavedWorkPanel />;
    } else if (exceedsMaxLength) {
      return <ErrorUrlTooLongPanel isUnsaved={false} />;
    }
    return (
      <EuiToolTip content="Copy this POST URL to call generation from outside Kibana or from Watcher.">
        <EuiCopy textToCopy={absoluteUrl} anchorClassName="eui-displayBlock">
          {(copy) => (
            <EuiButtonEmpty
              iconType="copy"
              flush="both"
              onClick={copy}
              data-test-subj="shareReportingCopyURL"
            >
              <FormattedMessage
                id="xpack.reporting.modalContent.copyUrlButtonLabel"
                defaultMessage="Copy POST URL  "
              />
            </EuiButtonEmpty>
          )}
        </EuiCopy>
      </EuiToolTip>
    );
  };

  const saveWarningMessageWithButton =
    objectId === undefined || objectId === '' || !isSaved || props.isDirty || isStale ? (
      <EuiFormRow>
        <EuiToolTip content="Please save your work before generating a report.">
          <EuiButton
            disabled={Boolean(createReportingJob)}
            fill
            onClick={() => generateReportingJob()}
            data-test-subj="generateReportButton"
            isLoading={Boolean(createReportingJob)}
          >
            <FormattedMessage
              id="xpack.reporting.modalContent.generateButtonLabel"
              defaultMessage="Generate report"
            />
          </EuiButton>
        </EuiToolTip>
      </EuiFormRow>
    ) : (
      <EuiButton
        disabled={Boolean(createReportingJob)}
        fill
        onClick={() => generateReportingJob()}
        data-test-subj="generateReportButton"
        isLoading={Boolean(createReportingJob)}
      >
        <FormattedMessage
          id="xpack.reporting.generateReportButtonLabel"
          defaultMessage="Generate report"
        />
      </EuiButton>
    );

  return (
    <>
      <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
        <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
          {objectType === 'lens' && !isDisabled ? (
            <EuiRadioGroup
              options={[
                { id: 'printablePdfV2', label: 'PDF' },
                { id: 'pngV2', label: 'PNG', 'data-test-subj': 'pngReportOption' },
                { id: 'csv', label: 'CSV', 'data-test-subj': 'csvReportOption' },
              ]}
              onChange={(id) => {
                setSelectedRadio(id as Exclude<AllowedImageExportType, 'printablePdf'>);
              }}
              name="image reporting radio group"
              idSelected={selectedRadio}
              legend={{
                children: <span>File type</span>,
              }}
            />
          ) : (
            <EuiRadioGroup
              options={[
                { id: 'printablePdfV2', label: 'PDF' },
                { id: 'pngV2', label: 'PNG', 'data-test-subj': 'pngReportOption' },
              ]}
              onChange={(id) => {
                setSelectedRadio(id as Exclude<AllowedImageExportType, 'printablePdf'>);
              }}
              name="image reporting radio group"
              idSelected={selectedRadio}
              legend={{
                children: <span>File type</span>,
              }}
            />
          )}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {renderCopyURLButton({ isUnsaved: !isSaved, exceedsMaxLength })}
      </EuiForm>
      <EuiModalFooter>{saveWarningMessageWithButton}</EuiModalFooter>
    </>
  );
};

export const ReportingModalContent = injectI18n(ReportingModalContentUI);
