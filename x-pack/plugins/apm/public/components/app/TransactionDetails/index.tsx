/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { EuiFlexGrid } from '@elastic/eui';
import { isEmpty, flatten } from 'lodash';
import { useTransactionCharts } from '../../../hooks/useTransactionCharts';
import { useTransactionDistribution } from '../../../hooks/useTransactionDistribution';
import { useWaterfall } from '../../../hooks/useWaterfall';
import { TransactionCharts } from '../../shared/charts/TransactionCharts';
import { ApmHeader } from '../../shared/ApmHeader';
import { TransactionDistribution } from './Distribution';
import { WaterfallWithSummmary } from './WaterfallWithSummmary';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import { TransactionBreakdown } from '../../shared/TransactionBreakdown';
import { ChartsSyncContextProvider } from '../../../context/ChartsSyncContext';
import { useTrackPageview } from '../../../../../observability/public';
import { Projection } from '../../../../common/projections';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { HeightRetainer } from '../../shared/HeightRetainer';
import { ErroneousTransactionsRateChart } from '../../shared/charts/ErroneousTransactionsRateChart';
import { history } from '../../../utils/history';
import { fromQuery, toQuery } from '../../shared/Links/url_helpers';

interface Sample {
  traceId: string;
  transactionId: string;
}

export function TransactionDetails() {
  const location = useLocation();
  const { urlParams } = useUrlParams();
  const {
    data: distributionData,
    status: distributionStatus,
  } = useTransactionDistribution(urlParams);

  const { data: transactionChartsData } = useTransactionCharts();
  const { waterfall, exceedsMax, status: waterfallStatus } = useWaterfall(
    urlParams
  );
  const { transactionName, transactionType, serviceName } = urlParams;

  useTrackPageview({ app: 'apm', path: 'transaction_details' });
  useTrackPageview({ app: 'apm', path: 'transaction_details', delay: 15000 });

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['transactionResult', 'serviceVersion'],
      projection: Projection.transactions,
      params: {
        transactionName,
        transactionType,
        serviceName,
      },
    };
    return config;
  }, [transactionName, transactionType, serviceName]);

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
    <div>
      <ApmHeader>
        <EuiTitle size="l">
          <h1>{transactionName}</h1>
        </EuiTitle>
      </ApmHeader>

      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <LocalUIFilters {...localUIFiltersConfig} />
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <ChartsSyncContextProvider>
            <EuiFlexGrid columns={2} gutterSize="s">
              <EuiFlexItem>
                <TransactionBreakdown />
              </EuiFlexItem>
              <EuiFlexItem>
                <ErroneousTransactionsRateChart />
              </EuiFlexItem>
            </EuiFlexGrid>

            <EuiSpacer size="s" />

            <TransactionCharts
              charts={transactionChartsData}
              urlParams={urlParams}
              location={location}
            />
          </ChartsSyncContextProvider>

          <EuiHorizontalRule size="full" margin="l" />

          <EuiPanel>
            <TransactionDistribution
              distribution={distributionData}
              isLoading={distributionStatus === FETCH_STATUS.LOADING}
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
