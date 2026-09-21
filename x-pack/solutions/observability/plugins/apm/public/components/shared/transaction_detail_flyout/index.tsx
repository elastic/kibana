/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import React, { useCallback, useMemo, useState } from 'react';
import { TraceWaterfallFlyout } from '../../app/transaction_details/waterfall_with_summary/trace_waterfall_flyout';
import { TransactionDetailFlyoutHeader } from './header';
import { TransactionDetailFlyoutFooter } from './footer';
import { TransactionDetailFlyoutLatencyDistribution } from './latency_distribution';
import { TransactionDetailFlyoutRedMetrics } from './red_metrics';
import { TransactionDetailFlyoutSummary } from './summary';
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
  preferDocumentBasedCharts,
  schema,
  indices,
}: TransactionDetailFlyoutComponentProps) {
  const { transactionName, rangeFrom, rangeTo } = filters;
  const titleId = useGeneratedHtmlId({ prefix: 'transactionDetailFlyoutTitle' });
  const [fullTraceFlyout, setFullTraceFlyout] = useState<FullTraceFlyoutState | null>(null);

  const openFullTraceFlyout = useCallback((state: FullTraceFlyoutState) => {
    setFullTraceFlyout(state);
  }, []);

  const contextValue = useMemo<TransactionDetailFlyoutContextValue>(
    () => ({
      deps,
      contextActions,
      filters,
      preferDocumentBasedCharts,
      schema,
      indices,
      openFullTraceFlyout,
    }),
    [deps, contextActions, filters, preferDocumentBasedCharts, schema, indices, openFullTraceFlyout]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <TransactionDetailFlyoutContextProvider value={contextValue}>
      <EuiFlyout
        data-test-subj="transactionDetailFlyout"
        flyoutMenuDisplayMode="always"
        onClose={onClose}
        ownFocus={false}
        size="fill"
        paddingSize="m"
        session="inherit"
        historyKey={historyKey}
        flyoutMenuProps={{ title: transactionName }}
        aria-labelledby={titleId}
      >
        <TransactionDetailFlyoutHeader transactionName={transactionName} titleId={titleId} />
        <EuiFlyoutBody>
          {isFiltersStale ? (
            <>
              <KbnWarningCallout
                size="s"
                data-test-subj="transactionDetailFlyoutStaleFiltersCallout"
                title={STALE_FILTERS_CALLOUT_TITLE}
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <TransactionDetailFlyoutSummary />
          <EuiSpacer size="m" />
          <TransactionDetailFlyoutRedMetrics />
          <EuiSpacer size="m" />
          <TransactionDetailFlyoutLatencyDistribution />
          <EuiSpacer size="m" />
          <TransactionDetailFlyoutTraceSample />
        </EuiFlyoutBody>
        <TransactionDetailFlyoutFooter />
      </EuiFlyout>
      {fullTraceFlyout ? (
        <TraceWaterfallFlyout
          traceId={fullTraceFlyout.traceId}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          isOpen
          onClose={() => setFullTraceFlyout(null)}
          contextSpanIds={fullTraceFlyout.contextSpanIds}
          historyKey={historyKey}
          deps={deps}
        />
      ) : null}
    </TransactionDetailFlyoutContextProvider>
  );
}
