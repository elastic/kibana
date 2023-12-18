/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ToastsSetup } from '@kbn/core-notifications-browser';
import { ThemeServiceSetup } from '@kbn/core-theme-browser';
import { IUiSettingsClient } from '@kbn/core/public';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import url from 'url';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React, { FC, useEffect, useState } from 'react';
import type { LayoutParams } from '@kbn/screenshotting-plugin/common/layout';
import useMountedState from 'react-use/lib/useMountedState';
import { JobParamsProviderOptions } from '.';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ErrorUrlTooLongPanel, ErrorUnsavedWorkPanel } from './reporting_panel_content/components';
import { getMaxUrlLength } from './reporting_panel_content/constants';
import { AppParams } from '../lib/reporting_api_client/reporting_api_client';

export interface ReportingModalProps {
  apiClient: ReportingAPIClient;
  toasts: ToastsSetup;
  uiSettings: IUiSettingsClient;
  reportType?: string;
  requiresSavedState: boolean; // Whether the report to be generated requires saved state that is not captured in the URL submitted to the report generator.
  jobProviderOptions: JobParamsProviderOptions;
  objectId?: string;
  isDirty?: boolean;
  onClose: () => void;
  theme: ThemeServiceSetup;
  layoutOption?: 'print' | 'canvas';
}

export type Props = ReportingModalProps & { intl?: InjectedIntl };

const getJobParams = (
  apiClient: ReportingAPIClient,
  opts: JobParamsProviderOptions,
  type: string
) => {
  const {
    objectType = 'dashboard',
    sharingData: { title, layout, locatorParams },
  } = opts;

  if (!['pngV2', 'printablePdfV2', 'printablePdf'].includes(type)) return;

  const baseParams = {
    objectType,
    layout,
    title,
  };

  if (type === 'printablePdfV2') {
    // multi locator for PDF V2
    return { ...baseParams, locatorParams: [locatorParams] } as AppParams;
  } else if (type === 'pngV2') {
    // single locator for PNG V2
    return { ...baseParams, locatorParams } as AppParams;
  } else {
    // Relative URL must have URL prefix (Spaces ID prefix), but not server basePath
    // Replace hashes with original RISON values.
    const relativeUrl = opts.shareableUrl.replace(
      window.location.origin + apiClient.getServerBasePath(),
      ''
    );
    // multi URL for PDF
    return { ...baseParams, relativeUrls: [relativeUrl] } as AppParams;
  }
};

const renderDescription = (objectType: string) => {
  return objectType === 'dashboard'
    ? `PNG & PDF reports can take a few minutes to generate based upon the size of your dashboard`
    : `CSV reports can take a few minutes to generate based upon the size of your report `;
};

export const ReportingModalContentUI: FC<Props> = (props: Props) => {
  const { apiClient, jobProviderOptions, intl, toasts, theme, onClose, objectId, layoutOption } =
    props;

  const isSaved = Boolean(objectId);
  const [, setIsStale] = useState(false);
  const [createReportingJob, setCreatingReportJob] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState<string>('printablePdfV2');
  const [usePrintLayout, setPrintLayout] = useState(false);
  const [useCanvasLayout, setCanvasLayout] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const isMounted = useMountedState();
  const [objectType] = useState<string>('dashboard');
  const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();

  const getAbsoluteReportGenerationUrl = () => {
    if (getJobParams(apiClient, jobProviderOptions, selectedRadio) !== undefined) {
      const relativePath = apiClient.getReportingPublicJobPath(
        selectedRadio,
        apiClient.getDecoratedJobParams(getJobParams(apiClient, jobProviderOptions, selectedRadio)!)
      );
      return url.resolve(window.location.href, relativePath);
    }
  };

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

  const getLayout = (): LayoutParams => {
    let dimensions = getJobParams(apiClient, jobProviderOptions, selectedRadio)?.layout?.dimensions;
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

  const getJobsParams = () => {
    return {
      ...getJobParams(apiClient, jobProviderOptions, selectedRadio),
      layout: getLayout(),
    };
  };

  // issue generating reports with locator params
  const generateReportingJob = () => {
    // @ts-ignore not sure where objectType is undefined
    const decoratedJobParams = apiClient.getDecoratedJobParams(getJobsParams());
    setCreatingReportJob(true);
    return apiClient
      .createReportingJob(selectedRadio, decoratedJobParams)
      .then(() => {
        toasts.addSuccess({
          title: intl!.formatMessage(
            {
              id: 'xpack.reporting.modalContent.successfullyQueuedReportNotificationTitle',
              defaultMessage: 'Queued report for {objectType}',
            },
            { objectType }
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
        if (isMounted()) {
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
          <EuiLink onClick={copy} data-test-subj="shareReportingCopyURL">
            <FormattedMessage
              id="xpack.reporting.panelContent.copyUrlButtonLabel"
              defaultMessage="Export URL  "
            /> 
            <EuiIcon type="copy"/>
          </EuiLink>
        )}
      </EuiCopy>
    );
  };

  const saveWarningMessageWithButton =
    objectId === undefined || objectId === '' ? (
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
            id="xpack.reporting.generateButtonLabel"
            defaultMessage="Generate Export"
          />
        </EuiButton>
      </EuiFormRow>
    ) : (
      <EuiButton
        disabled={Boolean(createReportingJob)}
        fill
        onClick={() => generateReportingJob()}
        data-test-subj="generateReportButton"
        size="s"
        isLoading={Boolean(createReportingJob)}
      >
        <FormattedMessage
          id="xpack.reporting.generateButtonLabel"
          defaultMessage="Generate Export"
        />
      </EuiButton>
    );
  return (
    <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
      <EuiTitle>
        <EuiText>Share as PNG or PDF</EuiText>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow>
        <EuiText size="s">{renderDescription(objectType)}</EuiText>
      </EuiFormRow>
      <EuiSpacer size="xs" />
      <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
        <EuiRadioGroup
          options={[
            { id: 'printablePdfV2', label: 'PDF' },
            { id: 'pngV2', label: 'PNG' },
          ]}
          onChange={(id) => setSelectedRadio(id)}
          name="image reporting radio group"
          idSelected={selectedRadio}
        />
        {saveWarningMessageWithButton}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" justifyContent={'spaceBetween'}>
        {layoutOption && (
          <FormattedMessage
            css={{ overflowWrap: 'normal' }}
            id="xpack.reporting.screenCapturePanelContent.optimizeForPrintingHelpText"
            defaultMessage="Uses multiple pages, showing at most 2 visualizations per page"
          />
        )}
        <EuiFlexItem>{renderOptions()}</EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>{renderCopyURLButton({ isUnsaved: !isSaved, exceedsMaxLength })}</EuiFlexGroup>

      <EuiSpacer size="m" />
      <EuiFlexGroup direction="row" justifyContent="flexEnd">
        <EuiButton fill onSubmit={onClose}>
          <FormattedMessage id="xpack.reporting.doneButton" defaultMessage="Done" />
        </EuiButton>
      </EuiFlexGroup>
    </EuiForm>
  );
};

// @ts-ignore
export const ReportingModalContent = injectI18n(ReportingModalContentUI);
