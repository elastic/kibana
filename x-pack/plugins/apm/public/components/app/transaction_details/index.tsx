/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiPage,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { flatten, isEmpty } from 'lodash';
import React from 'react';
import { RouteComponentProps, useHistory } from 'react-router-dom';
import { useTrackPageview } from '../../../../../observability/public';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTransactionDistributionFetcher } from '../../../hooks/use_transaction_distribution_fetcher';
import { ApmHeader } from '../../shared/ApmHeader';
import { TransactionCharts } from '../../shared/charts/transaction_charts';
import { HeightRetainer } from '../../shared/HeightRetainer';
import { fromQuery, toQuery } from '../../shared/Links/url_helpers';
import { SearchBar } from '../../shared/search_bar';
import { TransactionDistribution } from './Distribution';
import { useWaterfallFetcher } from './use_waterfall_fetcher';
import { WaterfallWithSummmary } from './WaterfallWithSummmary';

interface Sample {
  traceId: string;
  transactionId: string;
}

type TransactionDetailsProps = RouteComponentProps<{ serviceName: string }>;

export function TransactionDetails({
  location,
  match,
}: TransactionDetailsProps) {
  const { urlParams } = useUrlParams();
  const history = useHistory();
  const {
    distributionData,
    distributionStatus,
  } = useTransactionDistributionFetcher();

  const {
    waterfall,
    exceedsMax,
    status: waterfallStatus,
  } = useWaterfallFetcher();
  const { transactionName } = urlParams;

  useTrackPageview({ app: 'apm', path: 'transaction_details' });
  useTrackPageview({ app: 'apm', path: 'transaction_details', delay: 15000 });

  const selectedSample = flatten(
    distributionData.buckets.map((bucket) => bucket.samples)
  ).find(
    (sample) =>
      sample.transactionId === urlParams.transactionId &&
      sample.traceId === urlParams.traceId
  );

  const bucketWithSample =
    selectedSample &&
    distributionData.buckets.find((bucket) =>
      bucket.samples.includes(selectedSample)
    );

  const traceSamples = bucketWithSample?.samples ?? [];
  const bucketIndex = bucketWithSample
    ? distributionData.buckets.indexOf(bucketWithSample)
    : -1;

  const selectSampleFromBucketClick = (sample: Sample) => {
    history.push({
      ...history.location,
      search: fromQuery({
        ...toQuery(history.location.search),
        transactionId: sample.transactionId,
        traceId: sample.traceId,
      }),
    });
  };

  return (
    <>
      <ApmHeader>
        <EuiTitle>
          <h1>{transactionName}</h1>
        </EuiTitle>
      </ApmHeader>
      <SearchBar showCorrelations />
      <EuiPage>
        <EuiFlexGroup direction="column" gutterSize="s">
          <ChartPointerEventContextProvider>
            <TransactionCharts />
          </ChartPointerEventContextProvider>

          <EuiHorizontalRule size="full" margin="l" />

          <EuiPanel>
            <TransactionDistribution
              distribution={distributionData}
              fetchStatus={distributionStatus}
              urlParams={urlParams}
              bucketIndex={bucketIndex}
              onBucketClick={(bucket) => {
                if (!isEmpty(bucket.samples)) {
                  selectSampleFromBucketClick(bucket.samples[0]);
                }
              }}
            />
          </EuiPanel>

          <EuiSpacer size="s" />

          <HeightRetainer>
            <WaterfallWithSummmary
              location={location}
              urlParams={urlParams}
              waterfall={waterfall}
              isLoading={waterfallStatus === FETCH_STATUS.LOADING}
              exceedsMax={exceedsMax}
              traceSamples={traceSamples}
            />
          </HeightRetainer>
        </EuiFlexGroup>
      </EuiPage>
    </>
  );
}
