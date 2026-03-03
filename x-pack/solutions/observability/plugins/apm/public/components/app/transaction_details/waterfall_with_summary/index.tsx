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
  EuiSpacer,
  EuiTitle,
  EuiSkeletonText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useMemo, useState } from 'react';
import type { SavedSearchTableConfig } from '@kbn/saved-search-component';
import { TransactionSummary } from '../../../shared/summary/transaction_summary';
import { TransactionActionMenu } from '../../../shared/transaction_action_menu/transaction_action_menu';
import { MaybeViewTraceLink } from './maybe_view_trace_link';
import type { TransactionTab } from './transaction_tabs';
import { TransactionTabs } from './transaction_tabs';
import type { Environment } from '../../../../../common/environment_rt';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { isNotInitiated, isPending, isSuccess } from '../../../../hooks/use_fetcher';
import type { WaterfallFetchResult } from '../use_waterfall_fetcher';
import type { UnifiedWaterfallFetcherResult } from '../use_unified_waterfall_fetcher';
import { OpenInDiscover } from '../../../shared/links/discover_links/open_in_discover';
import {
  getTraceParentChildrenMap,
  getRootItemOrFallback,
} from '../../../shared/trace_waterfall/use_trace_waterfall';

interface Props<TSample extends {}> {
  waterfallFetchResult: WaterfallFetchResult['waterfall'];
  traceSamples?: TSample[];
  traceSamplesFetchStatus: FETCH_STATUS;
  waterfallFetchStatus: FETCH_STATUS;
  environment: Environment;
  onSampleClick: (sample: TSample) => void;
  onTabClick: (tab: TransactionTab) => void;
  serviceName?: string;
  waterfallItemId?: string;
  detailTab?: TransactionTab;
  showCriticalPath: boolean;
  onShowCriticalPathChange: (showCriticalPath: boolean) => void;
  selectedSample?: TSample | null;
  logsTableConfig?: SavedSearchTableConfig;
  onLogsTableConfigChange?: (config: SavedSearchTableConfig) => void;
  useUnified: boolean;
  unifiedWaterfallFetchResult: UnifiedWaterfallFetcherResult;
  entryTransactionId?: string;
  rangeFrom: string;
  rangeTo: string;
  traceId?: string;
}

export function WaterfallWithSummary<TSample extends {}>({
  waterfallFetchResult,
  waterfallFetchStatus,
  traceSamples,
  traceSamplesFetchStatus,
  environment,
  onSampleClick,
  onTabClick,
  serviceName,
  waterfallItemId,
  detailTab,
  showCriticalPath,
  onShowCriticalPathChange,
  selectedSample,
  logsTableConfig,
  onLogsTableConfigChange,
  useUnified,
  unifiedWaterfallFetchResult,
  entryTransactionId,
  rangeFrom,
  rangeTo,
  traceId,
}: Props<TSample>) {
  const [sampleActivePage, setSampleActivePage] = useState(0);

  const isControlled = selectedSample !== undefined;

  const activeWaterfallStatus = useUnified
    ? unifiedWaterfallFetchResult.status
    : waterfallFetchStatus;

  const isLoading = isPending(activeWaterfallStatus) || isPending(traceSamplesFetchStatus);

  // When traceId is not present, call to waterfallFetchResult will not be initiated
  const isSucceeded =
    (isSuccess(activeWaterfallStatus) || isNotInitiated(activeWaterfallStatus)) &&
    isSuccess(traceSamplesFetchStatus);

  useEffect(() => {
    if (!isControlled) {
      setSampleActivePage(0);
    }
  }, [traceSamples, isControlled]);

  const goToSample = (index: number) => {
    const sample = traceSamples![index];
    if (!isControlled) {
      setSampleActivePage(index);
    }
    onSampleClick(sample);
  };

  const samplePageIndex = isControlled
    ? selectedSample
      ? traceSamples?.indexOf(selectedSample)
      : 0
    : sampleActivePage;

  const entryTransaction = useUnified
    ? unifiedWaterfallFetchResult.entryTransaction
    : waterfallFetchResult.entryTransaction;

  const unifiedRootTransactionDuration = useMemo(() => {
    if (!useUnified || unifiedWaterfallFetchResult.traceItems.length === 0) {
      return undefined;
    }
    const parentChildMap = getTraceParentChildrenMap(unifiedWaterfallFetchResult.traceItems, false);
    const { rootItem } = getRootItemOrFallback(
      parentChildMap,
      unifiedWaterfallFetchResult.traceItems,
      entryTransaction?.transaction.id
    );
    return rootItem?.duration;
  }, [useUnified, unifiedWaterfallFetchResult.traceItems, entryTransaction?.transaction.id]);

  if (!entryTransaction && traceSamples?.length === 0 && isSucceeded) {
    return (
      <EuiEmptyPrompt
        title={
          <div>
            {i18n.translate('xpack.apm.transactionDetails.traceNotFound', {
              defaultMessage: 'The selected trace cannot be found',
            })}
          </div>
        }
        data-test-subj="apmNoTraceFound"
        titleSize="s"
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center">
          {/* Prevent wrapping on narrow screens */}
          <EuiFlexItem grow={false} css={{ flexShrink: 0 }}>
            <EuiTitle size="xs">
              <h5>
                {i18n.translate('xpack.apm.transactionDetails.traceSampleTitle', {
                  defaultMessage: 'Trace sample',
                })}
              </h5>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow>
            {!!traceSamples?.length && (
              <EuiPagination
                pageCount={traceSamples.length}
                activePage={samplePageIndex}
                onPageClick={goToSample}
                compressed
                aria-label={i18n.translate(
                  'xpack.apm.transactionDetails.traceSamplePaginationLabel',
                  {
                    defaultMessage: 'Trace sample pages',
                  }
                )}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
              <EuiFlexItem grow={false}>
                <MaybeViewTraceLink
                  isLoading={isLoading}
                  transaction={entryTransaction}
                  waterfall={waterfallFetchResult}
                  environment={environment}
                  useUnified={useUnified}
                  traceItems={unifiedWaterfallFetchResult.traceItems}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <OpenInDiscover
                  variant="button"
                  dataTestSubj="apmWaterfallOpenInDiscoverButton"
                  indexType="traces"
                  rangeFrom={rangeFrom}
                  rangeTo={rangeTo}
                  label={i18n.translate(
                    'xpack.apm.transactionDetails.openFullTraceInDiscover.label',
                    { defaultMessage: 'Open full trace in Discover' }
                  )}
                  queryParams={{
                    traceId,
                    sortDirection: 'ASC',
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TransactionActionMenu isLoading={isLoading} transaction={entryTransaction} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {isLoading || !entryTransaction ? (
        <EuiFlexItem grow={false}>
          <EuiSpacer size="s" />
          <EuiSkeletonText lines={1} data-test-sub="loading-content" />
        </EuiFlexItem>
      ) : (
        <EuiFlexItem grow={false}>
          <TransactionSummary
            errorCount={
              useUnified
                ? unifiedWaterfallFetchResult.errors.length
                : waterfallFetchResult.totalErrorsCount
            }
            totalDuration={
              useUnified
                ? unifiedRootTransactionDuration
                : waterfallFetchResult.rootWaterfallTransaction?.duration
            }
            transaction={entryTransaction}
          />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <TransactionTabs
          transaction={entryTransaction}
          detailTab={detailTab}
          serviceName={serviceName}
          waterfallItemId={waterfallItemId}
          onTabClick={onTabClick}
          waterfall={waterfallFetchResult}
          isLoading={isLoading}
          showCriticalPath={showCriticalPath}
          onShowCriticalPathChange={onShowCriticalPathChange}
          logsTableConfig={logsTableConfig}
          onLogsTableConfigChange={onLogsTableConfigChange}
          useUnified={useUnified}
          unifiedWaterfallFetchResult={unifiedWaterfallFetchResult}
          entryTransactionId={entryTransactionId}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
