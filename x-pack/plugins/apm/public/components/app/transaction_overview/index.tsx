/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Location } from 'history';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTrackPageview } from '../../../../../observability/public';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { IUrlParams } from '../../../context/url_params_context/types';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { TransactionCharts } from '../../shared/charts/transaction_charts';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';
import { fromQuery, toQuery } from '../../shared/Links/url_helpers';
import { SearchBar } from '../../shared/search_bar';
import { TransactionTypeSelect } from '../../shared/transaction_type_select';
import { TransactionList } from './TransactionList';
import { useRedirect } from './useRedirect';
import { useTransactionListFetcher } from './use_transaction_list';

function getRedirectLocation({
  location,
  transactionType,
  urlParams,
}: {
  location: Location;
  transactionType?: string;
  urlParams: IUrlParams;
}): Location | undefined {
  const transactionTypeFromUrlParams = urlParams.transactionType;

  if (!transactionTypeFromUrlParams && transactionType) {
    return {
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        transactionType,
      }),
    };
  }
}

interface TransactionOverviewProps {
  serviceName: string;
}

export function TransactionOverview({ serviceName }: TransactionOverviewProps) {
  const location = useLocation();
  const { urlParams } = useUrlParams();
  const { transactionType } = useApmServiceContext();

  // redirect to first transaction type
  useRedirect(getRedirectLocation({ location, transactionType, urlParams }));

  useTrackPageview({ app: 'apm', path: 'transaction_overview' });
  useTrackPageview({ app: 'apm', path: 'transaction_overview', delay: 15000 });
  const {
    transactionListData,
    transactionListStatus,
  } = useTransactionListFetcher();

  // TODO: improve urlParams typings.
  // `serviceName` or `transactionType` will never be undefined here, and this check should not be needed
  if (!serviceName) {
    return null;
  }

  return (
    <>
      <SearchBar showCorrelations />

      <EuiPage>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                alignItems="center"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem>
                  <EuiTitle size="s">
                    <h2>
                      {i18n.translate('xpack.apm.transactionOverviewTitle', {
                        defaultMessage: 'Transactions',
                      })}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={2}>
                  <TransactionTypeSelect />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
          <TransactionCharts />
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
              items={transactionListData.items || []}
            />
          </EuiPanel>
        </EuiFlexGroup>
      </EuiPage>
    </>
  );
}
