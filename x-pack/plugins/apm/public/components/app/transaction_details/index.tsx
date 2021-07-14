/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHorizontalRule, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { flatten, isEmpty } from 'lodash';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTransactionDistributionFetcher } from '../../../hooks/use_transaction_distribution_fetcher';
import { TransactionCharts } from '../../shared/charts/transaction_charts';
import { HeightRetainer } from '../../shared/HeightRetainer';
import { fromQuery, toQuery } from '../../shared/Links/url_helpers';
import { TransactionDistribution } from './Distribution';
import { useWaterfallFetcher } from './use_waterfall_fetcher';
import { WaterfallWithSummary } from './waterfall_with_summary';

interface Sample {
  traceId: string;
  transactionId: string;
}

export function TransactionDetails() {
  const { urlParams } = useUrlParams();
  const history = useHistory();

  const {
    waterfall,
    exceedsMax,
    status: waterfallStatus,
  } = useWaterfallFetcher();

  const { path, query } = useApmParams(
    '/services/:serviceName/transactions/view'
  );

  const apmRouter = useApmRouter();

  const { transactionName } = query;

  const {
    distributionData,
    distributionStatus,
  } = useTransactionDistributionFetcher({ transactionName });

  useBreadcrumb({
    title: transactionName,
    href: apmRouter.link('/services/:serviceName/transactions/view', {
      path,
      query,
    }),
  });

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
      <EuiSpacer size="s" />

      <EuiTitle>
        <h2>{transactionName}</h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <ChartPointerEventContextProvider>
        <TransactionCharts />
      </ChartPointerEventContextProvider>

      <EuiHorizontalRule size="full" margin="l" />

      <EuiPanel hasBorder={true}>
        <TransactionDistribution
          distribution={distributionData}
          fetchStatus={distributionStatus}
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
        <WaterfallWithSummary
          urlParams={urlParams}
          waterfall={waterfall}
          isLoading={waterfallStatus === FETCH_STATUS.LOADING}
          exceedsMax={exceedsMax}
          traceSamples={traceSamples}
        />
      </HeightRetainer>
    </>
  );
}
