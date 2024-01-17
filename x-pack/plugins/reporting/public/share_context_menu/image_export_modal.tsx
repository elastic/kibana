/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import type { IUiSettingsClient, ThemeServiceSetup, ToastsSetup } from '@kbn/core/public';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import url from 'url';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React, { FC, useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { LayoutParams } from '@kbn/screenshotting-plugin/common';
import type { JobAppParamsPDFV2 } from '@kbn/reporting-export-types-pdf-common';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ErrorUrlTooLongPanel, ErrorUnsavedWorkPanel } from './reporting_panel_content/components';
import { getMaxUrlLength } from './reporting_panel_content/constants';
import type { JobParamsProviderOptions } from '.';
import { AppParams } from '../lib/reporting_api_client/reporting_api_client';

export interface ReportingModalProps {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  reportType?: string;
  requiresSavedState: boolean; // Whether the report to be generated requires saved state that is not captured in the URL submitted to the report generator.
  objectId?: string;
  isDirty?: boolean;
  onClose: () => void;
  theme: ThemeServiceSetup;
  layoutOption?: 'print' | 'canvas';
  // canvas breaks if required
  jobProviderOptions?: JobParamsProviderOptions;
  // needed for canvas
  getJobParams?: JobAppParamsPDFV2;
  objectType: string;
}

export type Props = ReportingModalProps & { intl: InjectedIntl };

export const ReportingModalContentUI: FC<Props> = (props: Props) => {
  const {
    apiClient,
    intl,
    toasts,
    theme,
    onClose,
    objectId,
    layoutOption,
    jobProviderOptions,
    objectType,
  } = props;
  const isSaved = Boolean(objectId);
  const [isStale, setIsStale] = useState(false);
  const [createReportingJob, setCreatingReportJob] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState<'pngV2' | 'printablePdfV2' | 'printablePdf'>(
    'printablePdfV2'
  );
  const [usePrintLayout, setPrintLayout] = useState(false);
  const [useCanvasLayout, setCanvasLayout] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const isMounted = useMountedState();
  const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();

  const getJobsParams = (
    type: 'pngV2' | 'printablePdf' | 'printablePdfV2',
    opts?: JobParamsProviderOptions
  ) => {
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
  };

  const getLayout = (): LayoutParams => {
    const { layout } = getJobsParams(selectedRadio, jobProviderOptions);

    let dimensions = layout?.dimensions;

    if (!dimensions) {
      const el = document.querySelector('[data-shared-items-container]');
      const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
      dimensions = { height, width };
    }
    if (usePrintLayout) {
      return { id: 'print', dimensions };
    }

    if (useCanvasLayout) {
      return { id: 'canvas', dimensions };
    }

    return { id: 'preserve_layout', dimensions };
  };

  const getJobParams = (shareableUrl?: boolean) => {
    return { ...getJobsParams(selectedRadio, jobProviderOptions), layout: getLayout() };
  };
  function getAbsoluteReportGenerationUrl() {
    if (
      getJobsParams(selectedRadio, jobProviderOptions) !== undefined &&
      objectType !== 'canvas workpad'
    ) {
      const relativePath = apiClient.getReportingPublicJobPath(
        selectedRadio,
        apiClient.getDecoratedJobParams(getJobParams(true) as unknown as AppParams)
      );
      return url.resolve(window.location.href, relativePath);
    }
  }

  const setAbsoluteReportGenerationUrl = () => {
    if (!isMounted || !getAbsoluteReportGenerationUrl()) {
      return;
    } else {
      setAbsoluteUrl(getAbsoluteReportGenerationUrl()!);
    }
  };

  const markAsStale = () => {
    if (!isMounted) return;
    setIsStale(true);
  };

  useEffect(() => {
    setAbsoluteReportGenerationUrl();
    markAsStale();
  });

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

  const handlePrintLayoutChange = (evt: EuiSwitchEvent) => {
    setPrintLayout(evt.target.checked);
    setCanvasLayout(false);
  };

  const handleCanvasLayoutChange = (evt: EuiSwitchEvent) => {
    setPrintLayout(false);
    setCanvasLayout(evt.target.checked);
  };

  const renderOptions = () => {
    if (layoutOption === 'print') {
      return (
        <EuiFormRow
          helpText={
            <FormattedMessage
              css={{ overflowWrap: 'normal' }}
              id="xpack.reporting.screenCapturePanelContent.optimizeForPrintingHelpText"
              defaultMessage="Uses multiple pages, showing at most 2 visualizations per page"
            />
          }
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.reporting.screenCapturePanelContent.optimizeForPrintingLabel"
                defaultMessage="Optimize for printing"
              />
            }
            checked={usePrintLayout}
            onChange={handlePrintLayoutChange}
            data-test-subj="usePrintLayout"
          />
        </EuiFormRow>
      );
    } else if (layoutOption === 'canvas') {
      return (
        <EuiFormRow
          helpText={
            <FormattedMessage
              id="xpack.reporting.screenCapturePanelContent.canvasLayoutHelpText"
              defaultMessage="Remove borders and footer logo"
            />
          }
        >
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.reporting.screenCapturePanelContent.canvasLayoutLabel"
                defaultMessage="Full page layout"
              />
            }
            checked={useCanvasLayout}
            onChange={handleCanvasLayoutChange}
            data-test-subj="reportModeToggle"
          />
        </EuiFormRow>
      );
    }
    return null;
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
              defaultMessage="Copy URL  "
            />
          </EuiButtonEmpty>
        )}
      </EuiCopy>
    );
  };

  const saveWarningMessageWithButton =
    objectId === undefined || objectId === '' || !isSaved || props.isDirty || isStale ? (
      <EuiFormRow
        helpText={
          <FormattedMessage
            id="xpack.reporting.modalContent.saveWorkDescription"
            defaultMessage="Please save your work before generating a report."
          />
        }
      >
        <EuiButton
          disabled={Boolean(createReportingJob)}
          fill
          onClick={() => generateReportingJob()}
          data-test-subj="generateReportButton"
          isLoading={Boolean(createReportingJob)}
        >
          <FormattedMessage
            id="xpack.reporting.modalContent.generateButtonLabel"
            defaultMessage="Generate export"
          />
        </EuiButton>
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
      <EuiModalHeader>
        <EuiModalHeaderTitle>Export</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {objectType === 'dashboard' && (
          <EuiCallOut
            size="s"
            id="xpack.reporting.modalContent.generationTimeDescription"
            title="Reports can take a few minutes to generate based upon the size of your dashboard."
            iconType="iInCircle"
          />
        )}
        <EuiSpacer size="m" />
        <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
          <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
            {layoutOption !== 'canvas' && (
              <EuiRadioGroup
                options={[
                  { id: 'printablePdfV2', label: 'PDF' },
                  { id: 'pngV2', label: 'PNG' },
                ]}
                onChange={(id) => {
                  setSelectedRadio(id as 'printablePdfV2' | 'pngV2');
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
          {renderOptions()}
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        {renderCopyURLButton({ isUnsaved: !isSaved, exceedsMaxLength })}
        <EuiFlexGroup>
          <EuiFlexItem grow={0}>
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem>
                <EuiButtonEmpty onClick={onClose}>
                  <FormattedMessage id="xpack.reporting.doneButton" defaultMessage="Done" />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>{saveWarningMessageWithButton}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
};

export const ReportingModalContent = injectI18n(ReportingModalContentUI);
