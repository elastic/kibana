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
import { useHistory } from 'react-router-dom';
import type { ApmUrlParams } from '../../../../context/url_params_context/types';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { LoadingStatePrompt } from '../../../shared/LoadingStatePrompt';
import { TransactionSummary } from '../../../shared/Summary/TransactionSummary';
import { TransactionActionMenu } from '../../../shared/transaction_action_menu/TransactionActionMenu';
import type { TraceSample } from '../../../../hooks/use_transaction_trace_samples_fetcher';
import { MaybeViewTraceLink } from './MaybeViewTraceLink';
import { TransactionTabs } from './TransactionTabs';
import { IWaterfall } from './waterfall_container/Waterfall/waterfall_helpers/waterfall_helpers';
import { useApmParams } from '../../../../hooks/use_apm_params';

interface Props {
  urlParams: ApmUrlParams;
  waterfall: IWaterfall;
  isLoading: boolean;
  traceSamples: TraceSample[];
}

export function WaterfallWithSummary({
  urlParams,
  waterfall,
  isLoading,
  traceSamples,
}: Props) {
  const history = useHistory();
  const [sampleActivePage, setSampleActivePage] = useState(0);

  const {
    query: { environment },
  } = useApmParams('/services/{serviceName}/transactions/view');

  useEffect(() => {
    setSampleActivePage(0);
  }, [traceSamples]);

  const goToSample = (index: number) => {
    setSampleActivePage(index);
    const sample = traceSamples[index];
    history.push({
      ...history.location,
      search: fromQuery({
        ...toQuery(history.location.search),
        transactionId: sample.transactionId,
        traceId: sample.traceId,
      }),
    });
  };

  const { entryWaterfallTransaction } = waterfall;
  if (!entryWaterfallTransaction) {
    const content = isLoading ? (
      <LoadingStatePrompt />
    ) : (
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

    return content;
  }

  const entryTransaction = entryWaterfallTransaction.doc;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem style={{ flexDirection: 'row', alignItems: 'center' }}>
          <EuiTitle size="xs">
            <h5>
              {i18n.translate('xpack.apm.transactionDetails.traceSampleTitle', {
                defaultMessage: 'Trace sample',
              })}
            </h5>
          </EuiTitle>
          {traceSamples && (
            <EuiPagination
              pageCount={traceSamples.length}
              activePage={sampleActivePage}
              onPageClick={goToSample}
              compressed
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <TransactionActionMenu transaction={entryTransaction} />
            </EuiFlexItem>
            <MaybeViewTraceLink
              transaction={entryTransaction}
              waterfall={waterfall}
              environment={environment}
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <TransactionSummary
        errorCount={waterfall.apiResponse.errorDocs.length}
        totalDuration={waterfall.rootTransaction?.transaction.duration.us}
        transaction={entryTransaction}
      />
      <EuiSpacer size="s" />

      <TransactionTabs
        transaction={entryTransaction}
        urlParams={urlParams}
        waterfall={waterfall}
      />
    </>
  );
}
