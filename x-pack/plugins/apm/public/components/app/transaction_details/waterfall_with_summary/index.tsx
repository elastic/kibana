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
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import type { IUrlParams } from '../../../../context/url_params_context/types';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { LoadingStatePrompt } from '../../../shared/LoadingStatePrompt';
import { TransactionSummary } from '../../../shared/Summary/TransactionSummary';
import { TransactionActionMenu } from '../../../shared/transaction_action_menu/TransactionActionMenu';
import { MaybeViewTraceLink } from './MaybeViewTraceLink';
import { TransactionTabs } from './TransactionTabs';
import { IWaterfall } from './waterfall_container/Waterfall/waterfall_helpers/waterfall_helpers';

type DistributionApiResponse = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/charts/distribution'>;

type DistributionBucket = DistributionApiResponse['buckets'][0];

interface Props {
  urlParams: IUrlParams;
  waterfall: IWaterfall;
  exceedsMax: boolean;
  isLoading: boolean;
  traceSamples: DistributionBucket['samples'];
}

export function WaterfallWithSummary({
  urlParams,
  waterfall,
  exceedsMax,
  isLoading,
  traceSamples,
}: Props) {
  const history = useHistory();
  const [sampleActivePage, setSampleActivePage] = useState(0);

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

    return <EuiPanel hasBorder={true}>{content}</EuiPanel>;
  }

  const entryTransaction = entryWaterfallTransaction.doc;

  return (
    <EuiPanel hasBorder={true}>
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
            />
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <TransactionSummary
        errorCount={waterfall.errorsCount}
        totalDuration={waterfall.rootTransaction?.transaction.duration.us}
        transaction={entryTransaction}
      />
      <EuiSpacer size="s" />

      <TransactionTabs
        transaction={entryTransaction}
        urlParams={urlParams}
        waterfall={waterfall}
        exceedsMax={exceedsMax}
      />
    </EuiPanel>
  );
}
