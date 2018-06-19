/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { HeaderContainer, HeaderMedium } from '../../shared/UIComponents';
import TabNavigation from '../../shared/TabNavigation';
import Charts from '../../shared/charts/TransactionCharts';
import List from './List';
import { OverviewChartsRequest } from '../../../store/reactReduxRequest/overviewCharts';
import { TransactionListRequest } from '../../../store/reactReduxRequest/transactionList';
import { ServiceDetailsRequest } from '../../../store/reactReduxRequest/serviceDetails';

import DynamicBaselineButton from './DynamicBaseline/Button';
import DynamicBaselineFlyout from './DynamicBaseline/Flyout';

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

class TransactionOverview extends Component {
  state = {
    isFlyoutOpen: false
  };

  onOpenFlyout = () => this.setState({ isFlyoutOpen: true });
  onCloseFlyout = () => this.setState({ isFlyoutOpen: false });

  render() {
    const {
      changeTransactionSorting,
      transactionSorting,
      urlParams,
      hasDynamicBaseline
    } = this.props;
    const { serviceName, transactionType } = urlParams;

    return (
      <div>
        <HeaderContainer>
          <h1>{serviceName}</h1>
          <DynamicBaselineButton onOpenFlyout={this.onOpenFlyout} />
        </HeaderContainer>

        <DynamicBaselineFlyout
          hasDynamicBaseline={hasDynamicBaseline}
          serviceName={serviceName}
          transactionType={transactionType}
          isOpen={this.state.isFlyoutOpen}
          onClose={this.onCloseFlyout}
        />

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

export default TransactionOverview;
