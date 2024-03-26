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
  EuiIcon,
  EuiModalFooter,
  EuiRadioGroup,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import type { IToasts, IUiSettingsClient, ThemeServiceSetup } from '@kbn/core/public';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import url from 'url';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React, { FC, useCallback, useEffect, useState, useMemo } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { LayoutParams } from '@kbn/screenshotting-plugin/common';
import { BaseParams } from '@kbn/reporting-common/types';
import { ReportingAPIClient } from '@kbn/reporting-public';
import { ErrorUrlTooLongPanel } from '@kbn/reporting-public/share/share_context_menu/reporting_panel_content/components';
import { JobAppParamsPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import { JobParamsPNGV2 } from '@kbn/reporting-export-types-png-common';

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
  toasts: IToasts;
  uiSettings: IUiSettingsClient;
  reportType?: string;
  requiresSavedState: boolean; // Whether the report to be generated requires saved state that is not captured in the URL submitted to the report generator.
  objectId?: string;
  isDirty?: boolean;
  onClose: () => void;
  theme: ThemeServiceSetup;
  jobProviderOptions?: JobParamsProviderOptions;
  getJobParams?: JobAppParamsPDFV2 | JobParamsPNGV2;
  objectType: string;
  isDisabled: boolean;
  warnings: string[];
  downloadCsvFromLens: () => void;
}

type AppParams = Omit<BaseParams, 'browserTimezone' | 'version'>;

export type Props = ReportingModalProps & { intl: InjectedIntl };

type AllowedImageExportType = 'pngV2' | 'printablePdfV2' | 'csv_searchsource';

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
    downloadCsvFromLens,
    getJobParams,
    isDirty,
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
        return { ...getJobParams };
      }

      const {
        sharingData: { title, layout, locatorParams },
      } = opts;

      const baseParams = {
        objectType,
        layout,
        title,
      };

      if (type === 'printablePdfV2') {
        // multi locator for PDF V2
        return { ...baseParams, locatorParams: [locatorParams] };
      } else if (type === 'pngV2') {
        // single locator for PNG V2
        return { ...baseParams, locatorParams };
      }
    },
    [getJobParams, objectType]
  );

  const getLayout = useCallback((): LayoutParams => {
    const el = document.querySelector('[data-shared-items-container]');
    const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
    const dimensions = { height, width };

    return { id: 'preserve_layout', dimensions };
  }, []);

  const getJobParamHelper = useCallback(
    (shareableUrl?: boolean) => {
      return { ...getJobsParams(selectedRadio, jobProviderOptions), layout: getLayout() };
    },
    [getJobsParams, jobProviderOptions, selectedRadio, getLayout]
  );

  const getAbsoluteReportGenerationUrl = useMemo(
    () => () => {
      if (getJobsParams(selectedRadio, jobProviderOptions) !== undefined) {
        const relativePath = apiClient.getReportingPublicJobPath(
          selectedRadio,
          apiClient.getDecoratedJobParams(getJobParamHelper(true) as unknown as AppParams)
        );
        return setAbsoluteUrl(url.resolve(window.location.href, relativePath));
      }
    },
    [apiClient, selectedRadio, getJobsParams, jobProviderOptions, getJobParamHelper]
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
    if (selectedRadio === 'csv_searchsource') {
      return downloadCsvFromLens();
    }
    const decoratedJobParams = apiClient.getDecoratedJobParams(
      getJobParamHelper() as unknown as AppParams
    );

    setCreatingReportJob(true);
    return apiClient
      .createReportingJob(selectedRadio, decoratedJobParams)
      .then(() => {
        toasts.addSuccess({
          title: intl.formatMessage(
            {
              id: 'xpack.lens.share.modalContent.successfullyQueuedReportNotificationTitle',
              defaultMessage: 'Queued report for {objectType}',
            },
            { objectType }
          ),
          text: toMountPoint(
            <FormattedMessage
              id="xpack.lens.share.modalContent.successfullyQueuedReportNotificationDescription"
              defaultMessage="Track its progress in {path}."
              values={{
                path: (
                  <a href={apiClient.getManagementLink()}>
                    <FormattedMessage
                      id="xpack.lens.share.publicNotifier.reportLink.reportingSectionUrlLinkLabel"
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
          title: intl.formatMessage({
            id: 'xpack.lens.share.modalContent.notification.reportingErrorTitle',
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

  const renderCopyURLButton = useCallback(() => {
    if (exceedsMaxLength) {
      return <ErrorUrlTooLongPanel isUnsaved={isDirty} />;
    }

    return (
      <>
        <EuiToolTip
          content={
            isDirty ? (
              <FormattedMessage
                id="xpack.lens.share.modalContent.unsavedStateErrorText"
                defaultMessage="Save your work before copying this URL."
              />
            ) : (
              <FormattedMessage
                id="xpack.lens.share.modalContent.savedStateErrorText"
                defaultMessage="Copy this POST URL to call generation from outside Kibana or from Watcher."
              />
            )
          }
        >
          <EuiCopy textToCopy={absoluteUrl}>
            {(copy) => (
              <EuiButtonEmpty
                iconType="copy"
                disabled={isDirty}
                flush="both"
                onClick={copy}
                data-test-subj="shareReportingCopyURL"
              >
                <FormattedMessage
                  id="xpack.lens.share.modalContent.copyUrlButtonLabel"
                  defaultMessage="Post URL"
                />
              </EuiButtonEmpty>
            )}
          </EuiCopy>
        </EuiToolTip>
        <EuiToolTip
          content={
            <FormattedMessage
              id="xpack.lens.share.postURLWatcherMessage"
              defaultMessage="Copy this POST URL to call generation from outside Kibana or from Watcher. Unsaved changes: URL may change if you upgrade Kibana"
            />
          }
        >
          <EuiIcon type="questionInCircle" />
        </EuiToolTip>
      </>
    );
  }, [absoluteUrl, exceedsMaxLength, isDirty]);

  const saveWarningMessageWithButton =
    objectId === undefined || objectId === '' || !isSaved || props.isDirty || isStale ? (
      <EuiFormRow>
        <EuiToolTip content="Please save your work before generating a report.">
          <EuiButton
            disabled={Boolean(createReportingJob)}
            fill={!isDirty}
            onClick={() => generateReportingJob()}
            data-test-subj="generateReportButton"
            isLoading={Boolean(createReportingJob)}
          >
            <FormattedMessage
              id="xpack.lens.modalContent.generateButtonLabel"
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
          id="xpack.lens.generateReportButtonLabel"
          defaultMessage="Generate report"
        />
      </EuiButton>
    );

  return (
    <>
      <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
        <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
          <EuiRadioGroup
            options={[
              { id: 'printablePdfV2', label: 'PDF' },
              { id: 'pngV2', label: 'PNG', 'data-test-subj': 'pngReportOption' },
              { id: 'csv_searchsource', label: 'CSV', 'data-test-subj': 'csvReportOption' },
            ]}
            onChange={(id) => {
              setSelectedRadio(id as Exclude<AllowedImageExportType, 'printablePdf'>);
              getJobsParams(selectedRadio);
            }}
            name="image reporting radio group"
            idSelected={selectedRadio}
            legend={{
              children: <span>File type</span>,
            }}
          />
        </EuiFlexGroup>
        <EuiSpacer size="m" />
      </EuiForm>
      <EuiModalFooter>
        {renderCopyURLButton()}
        {saveWarningMessageWithButton}
      </EuiModalFooter>
    </>
  );
};

export const ReportingModalContent = injectI18n(ReportingModalContentUI);
