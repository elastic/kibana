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
import React, { useEffect, useState } from 'react';
import { TransactionSummary } from '../../../shared/summary/transaction_summary';
import { TransactionActionMenu } from '../../../shared/transaction_action_menu/transaction_action_menu';
import { MaybeViewTraceLink } from './maybe_view_trace_link';
import { TransactionTab, TransactionTabs } from './transaction_tabs';
import { Environment } from '../../../../../common/environment_rt';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { WaterfallFetchResult } from '../use_waterfall_fetcher';

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
}: Props<TSample>) {
  const [sampleActivePage, setSampleActivePage] = useState(0);

  const isControlled = selectedSample !== undefined;

  const isLoading =
    waterfallFetchStatus === FETCH_STATUS.LOADING ||
    traceSamplesFetchStatus === FETCH_STATUS.LOADING;
  // When traceId is not present, call to waterfallFetchResult will not be initiated
  const isSucceded =
    (waterfallFetchStatus === FETCH_STATUS.SUCCESS ||
      waterfallFetchStatus === FETCH_STATUS.NOT_INITIATED) &&
    traceSamplesFetchStatus === FETCH_STATUS.SUCCESS;

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

  const { entryTransaction } = waterfallFetchResult;

  if (!entryTransaction && traceSamples?.length === 0 && isSucceded) {
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
          <EuiFlexItem grow={false}>
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
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <TransactionActionMenu isLoading={isLoading} transaction={entryTransaction} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <MaybeViewTraceLink
                  isLoading={isLoading}
                  transaction={entryTransaction}
                  waterfall={waterfallFetchResult}
                  environment={environment}
                />
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
            errorCount={waterfallFetchResult.totalErrorsCount}
            totalDuration={waterfallFetchResult.rootWaterfallTransaction?.duration}
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
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
