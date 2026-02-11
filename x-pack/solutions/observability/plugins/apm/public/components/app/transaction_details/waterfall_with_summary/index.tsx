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
import type { SavedSearchTableConfig } from '@kbn/saved-search-component';
import { TransactionSummary } from '../../../shared/summary/transaction_summary';
import { TransactionActionMenu } from '../../../shared/transaction_action_menu/transaction_action_menu';
import { MaybeViewTraceLink } from './maybe_view_trace_link';
import type { TransactionTab } from './transaction_tabs';
import { TransactionTabs } from './transaction_tabs';
import type { Environment } from '../../../../../common/environment_rt';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { WaterfallFetchResult } from '../use_waterfall_fetcher';
import { OpenInDiscover } from '../../../shared/links/discover_links/open_in_discover';
import type { ESQLQueryParams } from '../../../shared/links/discover_links/get_esql_query';

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
  rangeFrom: string;
  rangeTo: string;
  queryParams?: ESQLQueryParams;
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
  rangeFrom,
  rangeTo,
  queryParams,
}: Props<TSample>) {
  const [sampleActivePage, setSampleActivePage] = useState(0);

  const isControlled = selectedSample !== undefined;

  const isLoading =
    waterfallFetchStatus === FETCH_STATUS.LOADING ||
    traceSamplesFetchStatus === FETCH_STATUS.LOADING;
  // When traceId is not present, call to waterfallFetchResult will not be initiated
  const isSucceeded =
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
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <OpenInDiscover
                  variant="button"
                  dataTestSubj="apmWaterfallOpenInDiscoverButton"
                  indexType="traces"
                  rangeFrom={rangeFrom}
                  rangeTo={rangeTo}
                  queryParams={{
                    ...queryParams,
                    serviceName,
                    environment,
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
          logsTableConfig={logsTableConfig}
          onLogsTableConfigChange={onLogsTableConfigChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
