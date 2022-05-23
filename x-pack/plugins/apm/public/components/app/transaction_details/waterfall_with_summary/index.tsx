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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { LoadingStatePrompt } from '../../../shared/loading_state_prompt';
import { TransactionSummary } from '../../../shared/summary/transaction_summary';
import { TransactionActionMenu } from '../../../shared/transaction_action_menu/transaction_action_menu';
import type { TraceSample } from '../../../../hooks/use_transaction_trace_samples_fetcher';
import { MaybeViewTraceLink } from './maybe_view_trace_link';
import { TransactionTab, TransactionTabs } from './transaction_tabs';
import { IWaterfall } from './waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';
import { Environment } from '../../../../../common/environment_rt';

interface Props {
  waterfall: IWaterfall;
  isLoading: boolean;
  traceSamples: TraceSample[];
  environment: Environment;
  onSampleClick: (sample: { transactionId: string; traceId: string }) => void;
  onTabClick: (tab: string) => void;
  serviceName?: string;
  waterfallItemId?: string;
  detailTab?: TransactionTab;
}

export function WaterfallWithSummary({
  waterfall,
  isLoading,
  traceSamples,
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
  }, [traceSamples]);

  const goToSample = (index: number) => {
    setSampleActivePage(index);
    const sample = traceSamples[index];
    onSampleClick(sample);
  };

  const { entryWaterfallTransaction } = waterfall;

  if ((!entryWaterfallTransaction || traceSamples.length === 0) && !isLoading) {
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
          <EuiPagination
            pageCount={traceSamples?.length ?? 0}
            activePage={sampleActivePage}
            onPageClick={goToSample}
            compressed
          />
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
                waterfall={waterfall}
                environment={environment}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      {isLoading || !entryTransaction ? (
        <LoadingStatePrompt />
      ) : (
        <>
          <TransactionSummary
            errorCount={waterfall.apiResponse.errorDocs.length}
            totalDuration={waterfall.rootTransaction?.transaction.duration.us}
            transaction={entryTransaction}
          />
          <EuiSpacer size="s" />
          <TransactionTabs
            transaction={entryTransaction}
            detailTab={detailTab}
            serviceName={serviceName}
            waterfallItemId={waterfallItemId}
            onTabClick={onTabClick}
            waterfall={waterfall}
          />
        </>
      )}
    </>
  );
}
