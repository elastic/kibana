/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import withErrorHandler from '../../shared/withErrorHandler';
import { HeaderLarge, HeaderMedium } from '../../shared/UIComponents';
import TabNavigation from '../../shared/TabNavigation';
import Charts from './Charts';
import List from './List';
import { getKey } from '../../../store/apiHelpers';

function loadTransactionList(props) {
  const { serviceName, start, end, transactionType } = props.urlParams;
  const key = getKey({ serviceName, start, end, transactionType });

  if (key && props.transactionList.key !== key) {
    props.loadTransactionList({ serviceName, start, end, transactionType });
  }
}

export class TransactionOverview extends Component {
  componentDidMount() {
    loadTransactionList(this.props);
  }

  componentWillReceiveProps(nextProps) {
    loadTransactionList(nextProps);
  }

  render() {
    const { serviceName, transactionType } = this.props.urlParams;
    const {
      changeTransactionSorting,
      transactionSorting,
      transactionList
    } = this.props;

    return (
      <div>
        <HeaderLarge>{serviceName}</HeaderLarge>
        <TabNavigation />
        <Charts />
        <HeaderMedium>{transactionTypeLabel(transactionType)}</HeaderMedium>
        <List
          serviceName={serviceName}
          type={transactionType}
          items={transactionList.data}
          changeTransactionSorting={changeTransactionSorting}
          transactionSorting={transactionSorting}
        />
      </div>
    );
  }
}

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

export default withErrorHandler(TransactionOverview, ['transactionList']);
