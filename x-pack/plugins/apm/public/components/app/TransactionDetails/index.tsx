/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPage,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { isEmpty, flatten } from 'lodash';
import { useHistory } from 'react-router-dom';
import { RouteComponentProps } from 'react-router-dom';
import { useTransactionCharts } from '../../../hooks/useTransactionCharts';
import { useTransactionDistribution } from '../../../hooks/useTransactionDistribution';
import { useWaterfall } from '../../../hooks/useWaterfall';
import { ApmHeader } from '../../shared/ApmHeader';
import { TransactionCharts } from '../../shared/charts/TransactionCharts';
import { TransactionDistribution } from './Distribution';
import { WaterfallWithSummmary } from './WaterfallWithSummmary';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import { LegacyChartsSyncContextProvider as ChartsSyncContextProvider } from '../../../context/charts_sync_context';
import { useTrackPageview } from '../../../../../observability/public';
import { Projection } from '../../../../common/projections';
import { fromQuery, toQuery } from '../../shared/Links/url_helpers';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { HeightRetainer } from '../../shared/HeightRetainer';
import { Correlations } from '../Correlations';
import { SearchBar } from '../../shared/search_bar';

interface Sample {
  traceId: string;
  transactionId: string;
}

type TransactionDetailsProps = RouteComponentProps<{ serviceName: string }>;

export function TransactionDetails({
  location,
  match,
}: TransactionDetailsProps) {
  const { serviceName } = match.params;
  const { urlParams } = useUrlParams();
  const history = useHistory();
  const {
    data: distributionData,
    status: distributionStatus,
  } = useTransactionDistribution(urlParams);

  const {
    data: transactionChartsData,
    status: transactionChartsStatus,
  } = useTransactionCharts();

  const { waterfall, exceedsMax, status: waterfallStatus } = useWaterfall(
    urlParams
  );
  const { transactionName, transactionType } = urlParams;

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
    <>
      <ApmHeader>
        <EuiTitle>
          <h1>{transactionName}</h1>
        </EuiTitle>
      </ApmHeader>
      <SearchBar />
      <EuiPage>
        <EuiFlexGroup>
          <EuiFlexItem grow={1}>
            <Correlations />
            <LocalUIFilters {...localUIFiltersConfig} />
          </EuiFlexItem>
          <EuiFlexItem grow={7}>
            <ChartsSyncContextProvider>
              <TransactionCharts
                fetchStatus={transactionChartsStatus}
                charts={transactionChartsData}
                urlParams={urlParams}
              />
            </ChartsSyncContextProvider>

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
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPage>
    </>
  );
}
