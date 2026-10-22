/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import { TraceWaterfallFlyout } from '../../app/transaction_details/waterfall_with_summary/trace_waterfall_flyout';
import { useResolvedApmIndices } from '../../../hooks/use_apm_indices';
import { TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS } from './ebt_constants';
import { useTransactionDetailFlyoutHeader } from './header';
import { useTransactionDetailFlyoutFooterMenu } from './footer';
import { TransactionDetailFlyoutLatencyDistribution } from './latency_distribution';
import { TransactionDetailFlyoutRedMetrics } from './red_metrics';
import { TransactionDetailFlyoutTraceSample } from './trace_sample';
import {
  TransactionDetailFlyoutContextProvider,
  type FullTraceFlyoutState,
  type TransactionDetailFlyoutContextValue,
} from './transaction_detail_flyout_context';
import type { TransactionDetailFlyoutProps } from './types';

export const TRANSACTION_DETAIL_FLYOUT_HISTORY_KEY = Symbol.for('apmTransactionDetailFlyout');

const STALE_FILTERS_CALLOUT_TITLE = i18n.translate(
  'xpack.apm.transactionDetailFlyout.staleFiltersCalloutTitle',
  {
    defaultMessage:
      "This transaction isn't available with the current filters. Showing previous data.",
  }
);

const ACTIONS_BUTTON_LABEL = i18n.translate(
  'xpack.apm.transactionDetailFlyout.actionsButtonLabel',
  {
    defaultMessage: 'Actions',
  }
);

interface TransactionDetailFlyoutContentProps {
  onClose: () => void;
  historyKey: symbol;
  isFiltersStale: boolean;
  isFiltersPending: boolean;
}

/**
 * Authors the `FlyoutTemplate` tree. Rendered inside the flyout's context provider so the header and
 * footer hooks have access. The template assembly only recognizes zones and parts that are direct
 * children of `<FlyoutTemplate>`, so they cannot be wrapped in sub-components.
 */
function TransactionDetailFlyoutContent({
  onClose,
  historyKey,
  isFiltersStale,
  isFiltersPending,
}: TransactionDetailFlyoutContentProps) {
  const { titleNode, titleText, metaBlocks, badges } = useTransactionDetailFlyoutHeader();
  const { panels, isLoading, hasActions } = useTransactionDetailFlyoutFooterMenu();

  return (
    <FlyoutTemplate
      data-test-subj="transactionDetailFlyout"
      onClose={onClose}
      ownFocus={false}
      size="fill"
      session="inherit"
      historyKey={historyKey}
    >
      <FlyoutTemplate.Header title={titleNode} titleText={titleText} isLoading={isFiltersPending}>
        {metaBlocks}
        {badges}
      </FlyoutTemplate.Header>
      <FlyoutTemplate.Body>
        {isFiltersStale ? (
          <FlyoutTemplate.Body.Callout
            level="warning"
            title={STALE_FILTERS_CALLOUT_TITLE}
            data-test-subj="transactionDetailFlyoutStaleFiltersCallout"
          />
        ) : null}
        <TransactionDetailFlyoutRedMetrics />
        <EuiSpacer size="m" />
        <TransactionDetailFlyoutLatencyDistribution />
        <EuiSpacer size="m" />
        <TransactionDetailFlyoutTraceSample />
      </FlyoutTemplate.Body>
      <FlyoutTemplate.Footer>
        <FlyoutTemplate.Footer.PrimaryActionMenu
          label={ACTIONS_BUTTON_LABEL}
          panels={panels}
          data-test-subj="transactionDetailFlyoutActionsButton"
          isLoading={isLoading}
          isDisabled={!hasActions}
          {...getEbtProps({
            action: EBT_CLICK_ACTIONS.OPEN_ACTIONS,
            element: TRANSACTION_DETAIL_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
          })}
        />
      </FlyoutTemplate.Footer>
    </FlyoutTemplate>
  );
}

interface TransactionDetailFlyoutComponentProps extends TransactionDetailFlyoutProps {
  deps: TransactionDetailFlyoutContextValue['deps'];
  contextActions?: TransactionDetailFlyoutContextValue['contextActions'];
}

export function TransactionDetailFlyout({
  deps,
  contextActions,
  filters,
  isOpen = true,
  onClose,
  historyKey = TRANSACTION_DETAIL_FLYOUT_HISTORY_KEY,
  isFiltersStale = false,
  isFiltersPending = false,
  refreshToken = 0,
  preferDocumentBasedCharts,
  schema,
  indicesSource,
  alertsCount,
}: TransactionDetailFlyoutComponentProps) {
  const { rangeFrom, rangeTo, start, end } = filters;
  const [fullTraceFlyout, setFullTraceFlyout] = useState<FullTraceFlyoutState | null>(null);
  const indices = useResolvedApmIndices({ http: deps.core.http, indicesSource });

  const openFullTraceFlyout = useCallback((state: FullTraceFlyoutState) => {
    setFullTraceFlyout(state);
  }, []);

  const contextValue = useMemo<TransactionDetailFlyoutContextValue>(
    () => ({
      deps,
      contextActions,
      filters,
      refreshToken,
      preferDocumentBasedCharts,
      schema,
      indices,
      alertsCount,
      openFullTraceFlyout,
    }),
    [
      deps,
      contextActions,
      filters,
      refreshToken,
      preferDocumentBasedCharts,
      schema,
      indices,
      alertsCount,
      openFullTraceFlyout,
    ]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <TransactionDetailFlyoutContextProvider value={contextValue}>
      <TransactionDetailFlyoutContent
        onClose={onClose}
        historyKey={historyKey}
        isFiltersStale={isFiltersStale}
        isFiltersPending={isFiltersPending}
      />
      {fullTraceFlyout ? (
        <TraceWaterfallFlyout
          traceId={fullTraceFlyout.traceId}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          start={start}
          end={end}
          isOpen
          onClose={() => setFullTraceFlyout(null)}
          contextSpanIds={fullTraceFlyout.contextSpanIds}
          historyKey={historyKey}
          deps={deps}
          indicesSource={{ indices }}
        />
      ) : null}
    </TransactionDetailFlyoutContextProvider>
  );
}
