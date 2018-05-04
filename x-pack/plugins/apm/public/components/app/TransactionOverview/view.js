/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { HeaderLarge, HeaderMedium } from '../../shared/UIComponents';
import TabNavigation from '../../shared/TabNavigation';
import Charts from '../../shared/charts/TransactionCharts';
import List from './List';
import { OverviewChartsRequest } from '../../../store/reactReduxRequest/overviewCharts';
import { TransactionListRequest } from '../../../store/reactReduxRequest/transactionList';
import { ServiceDetailsRequest } from '../../../store/reactReduxRequest/serviceDetails';
import { KueryBar } from '../../shared/KueryBar';

function ServiceDetailsAndTransactionList({ urlParams, render }) {
  return (
    <ServiceDetailsRequest
      urlParams={urlParams}
      render={serviceDetails => {
        return (
          <TransactionListRequest
            urlParams={urlParams}
            render={transactionList => {
              return render({
                transactionList: transactionList.data,
                serviceDetails: serviceDetails.data
              });
            }}
          />
        );
      }}
    />
  );
}

export default function TransactionOverview({
  changeTransactionSorting,
  transactionSorting,
  urlParams
}) {
  const { serviceName, transactionType } = urlParams;

  return (
    <div>
      <HeaderLarge>{serviceName}</HeaderLarge>

      <KueryBar />

      <TabNavigation />

      <OverviewChartsRequest
        urlParams={urlParams}
        render={({ data }) => <Charts charts={data} urlParams={urlParams} />}
      />

      <HeaderMedium>{transactionTypeLabel(transactionType)}</HeaderMedium>

      <ServiceDetailsAndTransactionList
        urlParams={urlParams}
        render={({ serviceDetails, transactionList }) => {
          return (
            <List
              agentName={serviceDetails.agentName}
              serviceName={serviceName}
              type={transactionType}
              items={transactionList}
              changeTransactionSorting={changeTransactionSorting}
              transactionSorting={transactionSorting}
            />
          );
        }}
      />
    </div>
  );
}

TransactionOverview.propTypes = {
  urlParams: PropTypes.object.isRequired
};

// TODO: This is duplicated in TabNavigation
function transactionTypeLabel(type) {
  switch (type) {
    case 'request':
      return 'Request';
    case 'page-load':
      return 'Page load';
    default:
      return type;
  }
}
