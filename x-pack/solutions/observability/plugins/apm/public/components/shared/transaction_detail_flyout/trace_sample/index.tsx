/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import {
  getRootItemOrFallback,
  getSubtreeIds,
  getTraceParentChildrenMap,
} from '@kbn/apm-ui-shared';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { FETCH_STATUS, isFailure, isPending, isSuccess } from '../../../../hooks/use_fetcher';
import { useUnifiedWaterfallFetcher } from '../../../app/transaction_details/use_unified_waterfall_fetcher';
import { MaybeViewTraceLink } from '../../../app/transaction_details/waterfall_with_summary/maybe_view_trace_link';
import { TransactionSummary } from '../../summary/transaction_summary';
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';
import { TransactionDetailFlyoutTraceSampleTimeline } from './trace_sample_timeline';
import { useTransactionDetailFlyoutTraceSamplesFetcher } from './use_transaction_detail_flyout_trace_samples_fetcher';

export function TransactionDetailFlyoutTraceSample() {
  const { filters, openFullTraceFlyout } = useTransactionDetailFlyoutContext();
  const { serviceName, rangeFrom, rangeTo } = filters;
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const traceSamplesFetchResult = useTransactionDetailFlyoutTraceSamplesFetcher(filters);
  const traceSamples = traceSamplesFetchResult.data?.traceSamples;

  const [sampleActivePage, setSampleActivePage] = useState(0);

  useEffect(() => {
    setSampleActivePage(0);
  }, [traceSamples]);

  const selectedSample = traceSamples?.[sampleActivePage];
  const traceId = selectedSample?.traceId;
  const entryTransactionId = selectedSample?.transactionId;

  const unifiedWaterfallFetchResult = useUnifiedWaterfallFetcher({
    start,
    end,
    traceId,
    entryTransactionId,
  });

  const isLoading =
    isPending(traceSamplesFetchResult.status) ||
    (!!traceId && isPending(unifiedWaterfallFetchResult.status));

  const hasFailed =
    isFailure(traceSamplesFetchResult.status) || isFailure(unifiedWaterfallFetchResult.status);

  const isSucceeded =
    (isSuccess(unifiedWaterfallFetchResult.status) ||
      unifiedWaterfallFetchResult.status === FETCH_STATUS.NOT_INITIATED) &&
    isSuccess(traceSamplesFetchResult.status);

  const entryTransaction = unifiedWaterfallFetchResult.entryTransaction;

  const unifiedRootTransactionDuration = useMemo(() => {
    if (unifiedWaterfallFetchResult.traceItems.length === 0) {
      return undefined;
    }
    const parentChildMap = getTraceParentChildrenMap(unifiedWaterfallFetchResult.traceItems, false);
    const { rootItem } = getRootItemOrFallback(
      parentChildMap,
      unifiedWaterfallFetchResult.traceItems,
      entryTransaction?.transaction.id
    );
    return rootItem?.duration;
  }, [unifiedWaterfallFetchResult.traceItems, entryTransaction?.transaction.id]);

  const contextSpanIds = useMemo(() => {
    if (!entryTransaction || unifiedWaterfallFetchResult.traceItems.length === 0) {
      return undefined;
    }
    const parentChildMap = getTraceParentChildrenMap(unifiedWaterfallFetchResult.traceItems, false);
    return getSubtreeIds(parentChildMap, entryTransaction.transaction.id);
  }, [entryTransaction, unifiedWaterfallFetchResult.traceItems]);

  const openSelectedFullTrace = useCallback(() => {
    if (!traceId) {
      return;
    }
    openFullTraceFlyout({ traceId, contextSpanIds });
  }, [traceId, contextSpanIds, openFullTraceFlyout]);

  if (hasFailed) {
    return (
      <EuiEmptyPrompt
        color="danger"
        title={
          <div>
            {i18n.translate('xpack.apm.transactionDetailFlyout.traceSample.loadError', {
              defaultMessage: 'Unable to load the trace sample',
            })}
          </div>
        }
        data-test-subj="transactionDetailFlyoutTraceSampleError"
        titleSize="s"
      />
    );
  }

  if (!entryTransaction && traceSamples?.length === 0 && isSucceeded) {
    return (
      <EuiEmptyPrompt
        title={
          <div>
            {i18n.translate('xpack.apm.transactionDetailFlyout.traceSample.traceNotFound', {
              defaultMessage: 'The selected trace cannot be found',
            })}
          </div>
        }
        data-test-subj="transactionDetailFlyoutTraceSampleEmpty"
        titleSize="s"
      />
    );
  }

  const showSampleLoading = isLoading || !entryTransaction;

  return (
    <section data-test-subj="transactionDetailFlyoutSection-traceSample">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false} css={{ flexShrink: 0 }}>
              <EuiTitle size="xs">
                <h5 data-test-subj="transactionDetailFlyoutTraceSampleTitle">
                  {i18n.translate('xpack.apm.transactionDetailFlyout.traceSample.title', {
                    defaultMessage: 'Trace sample',
                  })}
                </h5>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow>
              {!!traceSamples?.length && (
                <EuiPagination
                  pageCount={traceSamples.length}
                  activePage={sampleActivePage}
                  onPageClick={setSampleActivePage}
                  compressed
                  aria-label={i18n.translate(
                    'xpack.apm.transactionDetailFlyout.traceSample.paginationLabel',
                    {
                      defaultMessage: 'Trace sample pages',
                    }
                  )}
                />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <MaybeViewTraceLink
                isLoading={isLoading}
                transaction={entryTransaction}
                traceItems={unifiedWaterfallFetchResult.traceItems}
                onViewFullTrace={openSelectedFullTrace}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {showSampleLoading ? (
          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
            <EuiSkeletonText lines={1} data-test-subj="transactionDetailFlyoutTraceSampleLoading" />
          </EuiFlexItem>
        ) : (
          <EuiFlexItem grow={false}>
            <TransactionSummary
              errorCount={unifiedWaterfallFetchResult.errors.length}
              totalDuration={unifiedRootTransactionDuration}
              transaction={entryTransaction}
            />
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          {showSampleLoading ? (
            <EuiSkeletonText
              lines={3}
              data-test-subj="transactionDetailFlyoutTraceSampleTimelineLoading"
            />
          ) : (
            <TransactionDetailFlyoutTraceSampleTimeline
              traceItems={unifiedWaterfallFetchResult.traceItems}
              errors={unifiedWaterfallFetchResult.errors}
              agentMarks={unifiedWaterfallFetchResult.agentMarks}
              serviceName={serviceName}
              entryTransactionId={entryTransactionId}
              traceDocsTotal={unifiedWaterfallFetchResult.traceDocsTotal}
              maxTraceItems={unifiedWaterfallFetchResult.maxTraceItems}
              onNodeClick={openSelectedFullTrace}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </section>
  );
}
