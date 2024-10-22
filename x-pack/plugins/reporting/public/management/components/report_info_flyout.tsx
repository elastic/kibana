/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPortal,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ClientConfigType, Job, useInternalApiClient } from '@kbn/reporting-public';

import { InspectInConsoleButton } from './inspect_in_console_button/inspect_in_console_button';
import { ReportInfoFlyoutContent } from './report_info_flyout_content';

interface Props {
  config: ClientConfigType;
  onClose: () => void;
  job: Job;
}

export const ReportInfoFlyout: FunctionComponent<Props> = ({ config, onClose, job }) => {
  const isMounted = useMountedState();
  const { apiClient } = useInternalApiClient();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<undefined | Error>();
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState<boolean>(false);
  const [info, setInfo] = useState<undefined | Job>();

  useEffect(() => {
    async function loadInfo() {
      if (isLoading) {
        try {
          const infoResponse = await apiClient.getInfo(job.id);
          if (isMounted()) {
            setInfo(infoResponse);
          }
        } catch (err) {
          if (isMounted()) {
            setLoadingError(err);
          }
        } finally {
          if (isMounted()) {
            setIsLoading(false);
          }
        }
      }
    }
    loadInfo();
  }, [isLoading, apiClient, job.id, isMounted]);

  const actionsButton = (
    <EuiButton
      data-test-subj="reportInfoFlyoutActionsButton"
      iconType="arrowUp"
      onClick={() => setIsActionsPopoverOpen((isOpen) => !isOpen)}
    >
      {i18n.translate('xpack.reporting.reportInfoFlyout.actionsButtonLabel', {
        defaultMessage: 'Actions',
      })}
    </EuiButton>
  );

  const actionItems = [
    <EuiContextMenuItem
      data-test-subj="reportInfoFlyoutDownloadButton"
      key="download"
      icon="download"
      disabled={!job.isDownloadReady}
      onClick={() => {
        apiClient.downloadReport(job.id);
      }}
    >
      {i18n.translate('xpack.reporting.reportInfoFlyout.downloadButtonLabel', {
        defaultMessage: 'Download',
      })}
    </EuiContextMenuItem>,
    <InspectInConsoleButton job={job} config={config} />,
    <EuiContextMenuItem
      data-test-subj="reportInfoFlyoutOpenInKibanaButton"
      disabled={!job.canLinkToKibanaApp}
      key="openInKibanaApp"
      icon="popout"
      onClick={() => {
        window.open(apiClient.getKibanaAppHref(job), '_blank');
        window.focus();
      }}
    >
      {i18n.translate('xpack.reporting.reportInfoFlyout.openInKibanaAppButtonLabel', {
        defaultMessage: 'Open in Kibana',
      })}
    </EuiContextMenuItem>,
  ].filter(Boolean);

  const closePopover = () => setIsActionsPopoverOpen(false);

  return (
    <EuiPortal>
      <EuiFlyout
        ownFocus
        onClose={onClose}
        size="s"
        aria-labelledby="flyoutTitle"
        data-test-subj="reportInfoFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutTitle">
              {loadingError
                ? i18n.translate('xpack.reporting.listing.table.reportInfoUnableToFetch', {
                    defaultMessage: 'Unable to fetch report info.',
                  })
                : info?.title ??
                  i18n.translate('xpack.reporting.listing.table.untitledReport', {
                    defaultMessage: 'Untitled report',
                  })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {isLoading ? (
            <EuiLoadingSpinner />
          ) : loadingError ? undefined : !!info ? (
            <ReportInfoFlyoutContent info={info} config={config} />
          ) : undefined}
        </EuiFlyoutBody>
        {!isLoading && (
          <EuiFlyoutFooter>
            <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="cross" flush="left" onClick={onClose}>
                  {i18n.translate('xpack.reporting.listing.flyout.closeButtonLabel', {
                    defaultMessage: 'Close',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  id="reportInfoFlyoutActionsPopover"
                  button={actionsButton}
                  isOpen={isActionsPopoverOpen}
                  closePopover={closePopover}
                  panelPaddingSize="none"
                >
                  <EuiContextMenuPanel items={actionItems} />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        )}
      </EuiFlyout>
    </EuiPortal>
  );
};
