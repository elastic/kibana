/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';

import { ButtonSize, EuiButton, EuiLoadingSpinner, EuiText, EuiToolTip } from '@elastic/eui';

import { EnrichedDeprecationInfo, ReindexStatus } from '../../../../../../common/types';
import { LoadingState } from '../../../types';
import { ReindexFlyout } from './flyout';
import { useReindexStatus } from './use_reindex_status';
import { useAppContext } from '../../../../app_context';

const i18nTexts = {
  reindexButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindexing.reindexButtonLabel',
    {
      defaultMessage: 'Reindex',
    }
  ),
  loadingButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.reindexing.loadingButtonLabel',
    {
      defaultMessage: 'Loading…',
    }
  ),
  reindexingButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.reindexing.reindexingButtonLabel',
    {
      defaultMessage: 'Reindexing…',
    }
  ),
  doneButtonLabel: i18n.translate('xpack.upgradeAssistant.checkupTab.reindexing.doneButtonLabel', {
    defaultMessage: 'Done',
  }),
  failedButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.reindexing.failedButtonLabel',
    {
      defaultMessage: 'Failed',
    }
  ),
  pausedButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.reindexing.pausedButtonLabel',
    {
      defaultMessage: 'Paused',
    }
  ),
  canceledButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.reindexing.canceledButtonLabel',
    {
      defaultMessage: 'Canceled',
    }
  ),
  getTooltipLabel: (indexName: string) =>
    i18n.translate(
      'xpack.upgradeAssistant.checkupTab.reindexing.reindexButton.indexClosedToolTipDetails',
      {
        defaultMessage:
          '"{indexName}" needs to be reindexed, but it is currently closed. The Upgrade Assistant will open, reindex and then close the index. Reindexing may take longer than usual.',
        values: { indexName },
      }
    ),
};

interface ReindexButtonProps {
  indexName: string;
  reindexBlocker?: EnrichedDeprecationInfo['blockerForReindexing'];
}

export const ReindexButton: React.FunctionComponent<ReindexButtonProps> = ({
  indexName,
  reindexBlocker,
}) => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const { api, docLinks } = useAppContext();
  const { reindexState, startReindex, cancelReindex, updateStatus } = useReindexStatus({
    indexName,
    api,
  });

  useEffect(() => {
    updateStatus();
    // Get reindex initial status on component mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartReindex = () => {
    api.sendReindexTelemetryInfo({ start: true });
    startReindex();
  };

  const handleCancelReindex = () => {
    api.sendReindexTelemetryInfo({ cancel: true });
    cancelReindex();
  };

  const showFlyout = () => {
    api.sendReindexTelemetryInfo({ open: true });
    setIsFlyoutVisible(true);
  };

  const closeFlyout = () => {
    api.sendReindexTelemetryInfo({ close: true });
    setIsFlyoutVisible(false);
  };

  const commonButtonProps = { size: 's' as ButtonSize, onClick: showFlyout };
  const isIndexClosed =
    reindexBlocker === 'index-closed' && reindexState.status !== ReindexStatus.completed;

  let button = <EuiButton {...commonButtonProps}>{i18nTexts.reindexButtonLabel}</EuiButton>;

  if (reindexState.loadingState === LoadingState.Loading) {
    button = (
      <EuiButton disabled {...commonButtonProps}>
        {i18nTexts.loadingButtonLabel}
      </EuiButton>
    );
  } else {
    switch (reindexState.status) {
      case ReindexStatus.inProgress:
        button = (
          <EuiButton {...commonButtonProps}>
            {/* The isLoading prop doesn't work in this case, because we want the button to remain enabled */}
            <span>
              <EuiLoadingSpinner className="upgReindexButton__spinner" size="m" />
              {i18nTexts.reindexingButtonLabel}
            </span>
          </EuiButton>
        );
        break;
      case ReindexStatus.completed:
        button = (
          <EuiButton color="secondary" iconType="check" {...commonButtonProps}>
            {i18nTexts.doneButtonLabel}
          </EuiButton>
        );
        break;
      case ReindexStatus.cancelled:
      case ReindexStatus.failed:
        button = (
          <EuiButton color="danger" iconType="cross" {...commonButtonProps}>
            {ReindexStatus.failed ? i18nTexts.failedButtonLabel : i18nTexts.canceledButtonLabel}
          </EuiButton>
        );
        break;
      case ReindexStatus.paused:
        button = (
          <EuiButton color="warning" iconType="pause" {...commonButtonProps}>
            {i18nTexts.doneButtonLabel}
          </EuiButton>
        );
        break;
    }
  }

  return (
    <>
      {isIndexClosed ? (
        <EuiToolTip
          position="top"
          content={<EuiText size="s">{i18nTexts.getTooltipLabel(indexName)}</EuiText>}
        >
          <EuiButton {...commonButtonProps} color="warning" iconType="alert">
            {i18nTexts.reindexButtonLabel}
          </EuiButton>
        </EuiToolTip>
      ) : (
        button
      )}

      {isFlyoutVisible && (
        <ReindexFlyout
          reindexBlocker={reindexBlocker}
          docLinks={docLinks}
          indexName={indexName}
          closeFlyout={closeFlyout}
          reindexState={reindexState}
          startReindex={handleStartReindex}
          cancelReindex={handleCancelReindex}
        />
      )}
    </>
  );
};
