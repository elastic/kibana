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
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiRadioGroup,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { format as formatUrl, parse as parseUrl } from 'url';
import { ToastsSetup } from '@kbn/core-notifications-browser';
import { ThemeServiceSetup } from '@kbn/core-theme-browser';
import { IUiSettingsClient } from '@kbn/core/public';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import { Url as reportUrlFromUrl } from 'url';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import React, { FC, useEffect, useState } from 'react';
import type { LayoutParams } from '@kbn/screenshotting-plugin/common/layout';
import useMountedState from 'react-use/lib/useMountedState';
import { i18n } from '@kbn/i18n';
import { BrowserUrlService } from '@kbn/share-plugin/public';
import { JobParamsProviderOptions } from '.';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import { ErrorUrlTooLongPanel, ErrorUnsavedWorkPanel } from './reporting_panel_content/components';
import { getMaxUrlLength } from './reporting_panel_content/constants';
import { AppParams } from '../lib/reporting_api_client/reporting_api_client';
import { LocatorPublic } from '../shared_imports';
import { AnonymousAccessServiceContract } from '@kbn/share-plugin/common';

export enum ExportUrlAsType {
  EXPORT_URL_AS_SAVED_OBJECT = 'savedObject',
  EXPORT_URL_AS_SNAPSHOT = 'snapshot',
}

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
  shareableUrlLocatorParams?: {
    locator: LocatorPublic<any>;
    params: any;
  };
  urlService: BrowserUrlService;
  shareableUrlForSavedObject?: string;
  shareUrlForLocatorParams?: string;
  shareableUrl?: string;
  isEmbedded?: boolean;
}

interface UrlParams {
  [extensionName: string]: {
    [queryParam: string]: boolean;
  };
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
  const isMounted = useMountedState();
  const [, setIsStale] = useState(false);
  const [url, setUrl] = useState('')
  const [reportUrl, setReportUrl] = useState<reportUrlFromUrl | undefined>(undefined)
  const [shortUrl, setIsCreatingShortUrl] = useState<boolean | string>(false);
  const [createReportingJob, setCreatingReportJob] = useState(false);
  const [selectedRadio, setSelectedRadio] = useState<string>('printablePdfV2');
  const [usePrintLayout, setPrintLayout] = useState(false);
  const [useCanvasLayout, setCanvasLayout] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const [urlParams] = useState<undefined | UrlParams>(undefined);
  const [shortUrlCache, setShortUrlCache] = useState<string | undefined>(undefined);
  const [, setShortUrlErrorMsg] = useState<string | undefined>(undefined);
  const [objectType] = useState<string>('dashboard');
  const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();
  const [exportUrlAs] = useState<ExportUrlAsType>(ExportUrlAsType.EXPORT_URL_AS_SNAPSHOT);
  const [isShortUrl, setIsShortUrl] = useState<EuiSwitchEvent | string | boolean>();
  const [anonymousAccessParameters] = useState<null | AnonymousAccessServiceContract>(null);

  const getAbsoluteReportGenerationUrl = () => {
    if (getJobParams(apiClient, jobProviderOptions, selectedRadio) !== undefined) {
      const relativePath = apiClient.getReportingPublicJobPath(
        selectedRadio,
        apiClient.getDecoratedJobParams(getJobParams(apiClient, jobProviderOptions, selectedRadio)!)
      );
      return reportUrl?.resolve(window.location.href, relativePath);
    }
  };

  const setAbsoluteReportGenerationUrl = () => {
    if (!isMounted || !getAbsoluteReportGenerationUrl()) {
      return;
    } else {
      setAbsoluteUrl(getAbsoluteReportGenerationUrl()!);
    }
  };

  const getUrlParamExtensions = (tempUrl: string): string => {
    return urlParams
      ? Object.keys(urlParams).reduce((urlAccumulator, key) => {
          const urlParam = urlParams[key];
          return urlParam
            ? Object.keys(urlParam).reduce((queryAccumulator, queryParam) => {
                const isQueryParamEnabled = urlParam[queryParam];
                return isQueryParamEnabled
                  ? queryAccumulator + `&${queryParam}=true`
                  : queryAccumulator;
              }, urlAccumulator)
            : urlAccumulator;
        }, tempUrl)
      : tempUrl;
  };

  const updateUrlParams = (tempUrl: string) => {
    const temp = urlParams ? getUrlParamExtensions(tempUrl) : tempUrl;

    return setUrl(temp);
  };

  const getSnapshotUrl = (forSavedObject?: boolean) => {
    if (forSavedObject && props.shareableUrlForSavedObject) {
      setUrl(props.shareableUrlForSavedObject);
    }
    if (!url) {
      setUrl(props.shareableUrl || window.location.href);
    }
    return updateUrlParams(url);
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
  const createShortUrl = async () => {
    setIsShortUrl(true);
    setShortUrlErrorMsg(undefined);

    try {
      if (props.shareableUrlLocatorParams) {
        const shortUrls = props.urlService.shortUrls.get(null);
        const tempShortUrl = await shortUrls.createWithLocator(props.shareableUrlLocatorParams);
        setShortUrlCache(
          await tempShortUrl.locator.getUrl(tempShortUrl.params, { absolute: true })
        );
      } else {
        const snapshotUrl = getSnapshotUrl();
        const tempShortUrl = await props.urlService.shortUrls
          .get(null)
          .createFromLongUrl(snapshotUrl);
        setShortUrlCache(tempShortUrl.url);
      }
    } catch (fetchError) {
      if (!isMounted) {
        return;
      }

      setShortUrlCache(undefined);
      setIsShortUrl(true);
      setIsCreatingShortUrl(false);
      setShortUrlErrorMsg(
        i18n.translate('share.urlPanel.unableCreateShortUrlErrorMessage', {
          defaultMessage: 'Unable to create short URL. Error: {errorMessage}',
          values: {
            errorMessage: fetchError.message,
          },
        })
      );
    }
    setUrlHelper();
  };

  const renderExportURL = () => {
    createShortUrl();
    return <EuiText size="xs">Export URL</EuiText>;
  };

  const isNotSaved = () => {
    return objectId === undefined || objectId === '';
  };

  const getSavedObjectUrl = () => {
    if (isNotSaved()) {
      return;
    }

    setUrl(getSnapshotUrl(true));

    const parsedUrl = parseUrl(url);
    if (!parsedUrl || !parsedUrl.hash) {
      return url;
    }

    // Get the application route, after the hash, and remove the #.
    const parsedAppUrl = parseUrl(parsedUrl.hash.slice(1), true);

    const formattedUrl = formatUrl({
      protocol: parsedUrl.protocol,
      auth: parsedUrl.auth,
      host: parsedUrl.host,
      pathname: parsedUrl.pathname,
      hash: formatUrl({
        pathname: parsedAppUrl.pathname,
        query: {
          // Add global state to the URL so that the iframe doesn't just show the time range
          // default.
          _g: parsedAppUrl.query._g,
        },
      }),
    });
    return updateUrlParams(formattedUrl);
  };


  const addUrlAnonymousAccessParameters = (url: string): string => {
    if (!anonymousAccessParameters) {
      return url;
    }

    const parsedUrl = new URL(url);

    for (const [name, value] of Object.entries(anonymousAccessParameters)) {
      parsedUrl.searchParams.set(name, value);
    }

    return parsedUrl.toString();
  };

  const makeIframeTag = (url: string) => {
    if (!url) {
      return;
    }

    return `<iframe src="${url}" height="600" width="800"></iframe>`;
  }; 

  const setUrlHelper = () => {
    if (exportUrlAs === ExportUrlAsType.EXPORT_URL_AS_SAVED_OBJECT) {
      setUrl(getSavedObjectUrl()!);
    } else if (isShortUrl !== undefined && shortUrlCache !== undefined) {
      setUrl(shortUrlCache);
    } else {
      setUrl(getSnapshotUrl());
    }

    if (url !== '') {
      setUrl(addUrlAnonymousAccessParameters(url));
    }

    if (props.isEmbedded && url !== undefined) {
      setUrl(makeIframeTag(url)!);
    }

    setUrl(url);
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
          <EuiIcon onClick={copy} data-test-subj="shareReportingCopyURL" type={'copy'}>
            <FormattedMessage
              id="xpack.reporting.panelContent.copyUrlButtonLabel"
              defaultMessage="Export URL"
            />
          </EuiIcon>
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
      <EuiSpacer size="xs" />
      <EuiTitle>
        <EuiText>Share this dashboard</EuiText>
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
        <EuiFlexGroup>
          {renderOptions()}
          {renderExportURL()}
          {renderCopyURLButton({ isUnsaved: !isSaved, exceedsMaxLength })}
        </EuiFlexGroup>
      </EuiFlexGroup>
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
