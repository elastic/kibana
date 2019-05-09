/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Location } from 'history';
import { first } from 'lodash';
import React from 'react';
import { useTransactionList } from '../../../hooks/useTransactionList';
import { useTransactionOverviewCharts } from '../../../hooks/useTransactionOverviewCharts';
import { IUrlParams } from '../../../context/UrlParamsContext/types';
import { TransactionCharts } from '../../shared/charts/TransactionCharts';
import { legacyEncodeURIComponent } from '../../shared/Links/url_helpers';
import { TransactionList } from './List';
import { useRedirect } from './useRedirect';
import { useFetcher } from '../../../hooks/useFetcher';
import { getHasMLJob } from '../../../services/rest/ml';
import { history } from '../../../utils/history';
import { useLocation } from '../../../hooks/useLocation';

interface Props {
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
}

function getRedirectLocation({
  urlParams,
  location,
  serviceTransactionTypes
}: {
  location: Location;
  urlParams: IUrlParams;
  serviceTransactionTypes: string[];
}) {
  const { serviceName, transactionType } = urlParams;
  const firstTransactionType = first(serviceTransactionTypes);
  if (!transactionType && firstTransactionType) {
    return {
      ...location,
      pathname: `/${serviceName}/transactions/${firstTransactionType}`
    };
  }
}

export function TransactionOverview({
  urlParams,
  serviceTransactionTypes
}: Props) {
  const location = useLocation();
  const { serviceName, transactionType } = urlParams;

  // redirect to first transaction type
  useRedirect(
    history,
    getRedirectLocation({
      urlParams,
      location,
      serviceTransactionTypes
    })
  );

  const { data: transactionOverviewCharts } = useTransactionOverviewCharts(
    urlParams
  );

  // TODO: improve urlParams typings.
  // `serviceName` or `transactionType` will never be undefined here, and this check should not be needed
  if (!serviceName || !transactionType) {
    return null;
  }

  const { data: transactionListData } = useTransactionList(urlParams);
  const { data: hasMLJob = false } = useFetcher(
    () => getHasMLJob({ serviceName, transactionType }),
    [serviceName, transactionType]
  );

  return (
    <React.Fragment>
      {serviceTransactionTypes.length > 1 ? (
        <EuiFormRow
          id="transaction-type-select-row"
          label={i18n.translate(
            'xpack.apm.transactionsTable.filterByTypeLabel',
            {
              defaultMessage: 'Filter by type'
            }
          )}
        >
          <EuiSelect
            options={serviceTransactionTypes.map(type => ({
              text: `${type}`,
              value: type
            }))}
            value={transactionType}
            onChange={event => {
              const type = legacyEncodeURIComponent(event.target.value);
              history.push({
                ...location,
                pathname: `/${urlParams.serviceName}/transactions/${type}`
              });
            }}
          />
        </EuiFormRow>
      ) : null}

      <TransactionCharts
        hasMLJob={hasMLJob}
        charts={transactionOverviewCharts}
        location={location}
        urlParams={urlParams}
      />

      <EuiSpacer size="s" />

      <EuiPanel>
        <EuiTitle size="xs">
          <h3>Transactions</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <TransactionList
          items={transactionListData}
          serviceName={serviceName}
        />
      </EuiPanel>
    </React.Fragment>
  );
}
