/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiCallOut,
  EuiCode,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Location } from 'history';
import { first } from 'lodash';
import React, { useMemo } from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { Projection } from '../../../../common/projections';
import { ChartsSyncContextProvider } from '../../../context/ChartsSyncContext';
import { IUrlParams } from '../../../context/UrlParamsContext/types';
import { useLocation } from '../../../hooks/useLocation';
import { useServiceTransactionTypes } from '../../../hooks/useServiceTransactionTypes';
import { useTransactionCharts } from '../../../hooks/useTransactionCharts';
import { useTransactionList } from '../../../hooks/useTransactionList';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { ErroneousTransactionsRateChart } from '../../shared/charts/ErroneousTransactionsRateChart';
import { TransactionCharts } from '../../shared/charts/TransactionCharts';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';
import { fromQuery, toQuery } from '../../shared/Links/url_helpers';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { TransactionTypeFilter } from '../../shared/LocalUIFilters/TransactionTypeFilter';
import { TransactionBreakdown } from '../../shared/TransactionBreakdown';
import { TransactionList } from './List';
import { useRedirect } from './useRedirect';

function getRedirectLocation({
  urlParams,
  location,
  serviceTransactionTypes,
}: {
  location: Location;
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
}): Location | undefined {
  const { transactionType } = urlParams;
  const firstTransactionType = first(serviceTransactionTypes);

  if (!transactionType && firstTransactionType) {
    return {
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        transactionType: firstTransactionType,
      }),
    };
  }
}

export function TransactionOverview() {
  const location = useLocation();
  const { urlParams } = useUrlParams();
  const { serviceName, transactionType } = urlParams;

  // TODO: fetching of transaction types should perhaps be lifted since it is needed in several places. Context?
  const serviceTransactionTypes = useServiceTransactionTypes(urlParams);

  // redirect to first transaction type
  useRedirect(
    getRedirectLocation({
      urlParams,
      location,
      serviceTransactionTypes,
    })
  );

  const { data: transactionCharts } = useTransactionCharts();

  useTrackPageview({ app: 'apm', path: 'transaction_overview' });
  useTrackPageview({ app: 'apm', path: 'transaction_overview', delay: 15000 });
  const {
    data: transactionListData,
    status: transactionListStatus,
  } = useTransactionList(urlParams);

  const localFiltersConfig: React.ComponentProps<typeof LocalUIFilters> = useMemo(
    () => ({
      filterNames: [
        'transactionResult',
        'host',
        'containerId',
        'podName',
        'serviceVersion',
      ],
      params: {
        serviceName,
        transactionType,
      },
      projection: Projection.transactionGroups,
    }),
    [serviceName, transactionType]
  );

  // TODO: improve urlParams typings.
  // `serviceName` or `transactionType` will never be undefined here, and this check should not be needed
  if (!serviceName || !transactionType) {
    return null;
  }

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <LocalUIFilters {...localFiltersConfig}>
            <TransactionTypeFilter transactionTypes={serviceTransactionTypes} />
            <EuiSpacer size="m" />
            <EuiHorizontalRule margin="none" />
          </LocalUIFilters>
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
              charts={transactionCharts}
              location={location}
              urlParams={urlParams}
            />
          </ChartsSyncContextProvider>

          <EuiSpacer size="s" />

          <EuiPanel>
            <EuiTitle size="xs">
              <h3>Transactions</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            {!transactionListData.isAggregationAccurate && (
              <EuiCallOut
                title={i18n.translate(
                  'xpack.apm.transactionCardinalityWarning.title',
                  {
                    defaultMessage:
                      'This view shows a subset of reported transactions.',
                  }
                )}
                color="danger"
                iconType="alert"
              >
                <p>
                  <FormattedMessage
                    id="xpack.apm.transactionCardinalityWarning.body"
                    defaultMessage="The number of unique transaction names exceeds the configured value of {bucketSize}. Try reconfiguring your agents to group similar transactions or increase the value of {codeBlock}"
                    values={{
                      bucketSize: transactionListData.bucketSize,
                      codeBlock: (
                        <EuiCode>
                          xpack.apm.ui.transactionGroupBucketSize
                        </EuiCode>
                      ),
                    }}
                  />

                  <ElasticDocsLink
                    section="/kibana"
                    path="/troubleshooting.html#troubleshooting-too-many-transactions"
                  >
                    {i18n.translate(
                      'xpack.apm.transactionCardinalityWarning.docsLink',
                      { defaultMessage: 'Learn more in the docs' }
                    )}
                  </ElasticDocsLink>
                </p>
              </EuiCallOut>
            )}
            <EuiSpacer size="s" />
            <TransactionList
              isLoading={transactionListStatus === 'loading'}
              items={transactionListData.items}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
