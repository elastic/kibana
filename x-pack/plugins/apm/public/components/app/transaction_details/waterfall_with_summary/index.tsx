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
  EuiLoadingContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { TransactionSummary } from '../../../shared/summary/transaction_summary';
import { TransactionActionMenu } from '../../../shared/transaction_action_menu/transaction_action_menu';
import { MaybeViewTraceLink } from './maybe_view_trace_link';
import { TransactionTab, TransactionTabs } from './transaction_tabs';
import { Environment } from '../../../../../common/environment_rt';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { TraceSamplesFetchResult } from '../../../../hooks/use_transaction_trace_samples_fetcher';
import { WaterfallFetchResult } from '../use_waterfall_fetcher';

interface Props {
  waterfallFetchResult: WaterfallFetchResult;
  traceSamplesFetchResult: TraceSamplesFetchResult;
  environment: Environment;
  onSampleClick: (sample: { transactionId: string; traceId: string }) => void;
  onTabClick: (tab: string) => void;
  serviceName?: string;
  waterfallItemId?: string;
  detailTab?: TransactionTab;
}

export function WaterfallWithSummary({
  waterfallFetchResult,
  traceSamplesFetchResult,
  environment,
  onSampleClick,
  onTabClick,
  serviceName,
  waterfallItemId,
  detailTab,
}: Props) {
  const [sampleActivePage, setSampleActivePage] = useState(0);

  useEffect(() => {
    setSampleActivePage(0);
  }, [traceSamplesFetchResult.data.traceSamples]);

  const goToSample = (index: number) => {
    setSampleActivePage(index);
    const sample = traceSamplesFetchResult.data.traceSamples[index];
    onSampleClick(sample);
  };

  const { entryWaterfallTransaction } = waterfallFetchResult.waterfall;
  const isLoading =
    waterfallFetchResult.status === FETCH_STATUS.LOADING ||
    traceSamplesFetchResult.status === FETCH_STATUS.LOADING;
  const isSucceded =
    waterfallFetchResult.status === FETCH_STATUS.SUCCESS &&
    traceSamplesFetchResult.status === FETCH_STATUS.SUCCESS;

  if (
    !entryWaterfallTransaction &&
    traceSamplesFetchResult.data.traceSamples.length === 0 &&
    isSucceded
  ) {
    return (
      <EuiEmptyPrompt
        title={
          <div>
            {i18n.translate('xpack.apm.transactionDetails.traceNotFound', {
              defaultMessage: 'The selected trace cannot be found',
            })}
          </div>
        }
        titleSize="s"
      />
    );
  }

  const entryTransaction = entryWaterfallTransaction?.doc;

  return (
    <>
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
        <EuiFlexItem>
          {traceSamplesFetchResult.data.traceSamples.length > 0 && (
            <EuiPagination
              pageCount={traceSamplesFetchResult.data.traceSamples.length}
              activePage={sampleActivePage}
              onPageClick={goToSample}
              compressed
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <TransactionActionMenu
                isLoading={isLoading}
                transaction={entryTransaction}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <MaybeViewTraceLink
                isLoading={isLoading}
                transaction={entryTransaction}
                waterfall={waterfallFetchResult.waterfall}
                environment={environment}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {isLoading || !entryTransaction ? (
        <>
          <EuiSpacer size="s" />
          <EuiLoadingContent lines={1} data-test-sub="loading-content" />
        </>
      ) : (
        <TransactionSummary
          errorCount={
            waterfallFetchResult.waterfall.apiResponse.errorDocs.length
          }
          totalDuration={
            waterfallFetchResult.waterfall.rootTransaction?.transaction.duration
              .us
          }
          transaction={entryTransaction}
        />
      )}

      <EuiSpacer size="s" />

      <TransactionTabs
        transaction={entryTransaction}
        detailTab={detailTab}
        serviceName={serviceName}
        waterfallItemId={waterfallItemId}
        onTabClick={onTabClick}
        waterfall={waterfallFetchResult.waterfall}
        isLoading={isLoading}
      />
    </>
  );
}
