/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle
} from '@elastic/eui';
import TransactionPropertiesTable from './TransactionPropertiesTable';
import DiscoverButton from '../../../../../shared/DiscoverButton';
import TransactionCharts from '../../../../../shared/charts/TransactionCharts';
import {
  PROCESSOR_EVENT,
  TRANSACTION_ID
} from '../../../../../../../common/constants';
import StickyTransactionProperties from './StickyTransactionProperties';
import { TransactionDetailsChartsRequest } from '../../../../../../store/reactReduxRequest/transactionDetailsCharts';
import { TransactionDistributionRequest } from '../../../../../../store/reactReduxRequest/transactionDistribution';
import Distribution from '../../../Distribution';

function getDiscoverQuery(transactionId) {
  return {
    _a: {
      interval: 'auto',
      query: {
        language: 'lucene',
        query: `${PROCESSOR_EVENT}:transaction AND ${TRANSACTION_ID}:${transactionId}`
      }
    }
  };
}

export default function TransactionFlyout({
  transaction,
  onClose,
  isOpen,
  location,
  urlParams
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <EuiFlyout onClose={onClose} size="l">
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>Transaction details</h2>
        </EuiTitle>

        <DiscoverButton query={getDiscoverQuery(transaction.transaction.id)}>
          {`View transaction in Discover`}
        </DiscoverButton>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <TransactionDetailsChartsRequest
          urlParams={urlParams}
          render={({ data }) => (
            <TransactionCharts
              charts={data}
              urlParams={urlParams}
              location={location}
            />
          )}
        />

        <TransactionDistributionRequest
          urlParams={urlParams}
          render={({ data }) => (
            <Distribution distribution={data} urlParams={urlParams} />
          )}
        />

        <StickyTransactionProperties transaction={transaction} />

        <TransactionPropertiesTable
          transaction={transaction}
          location={location}
          urlParams={urlParams}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}

TransactionFlyout.propTypes = {
  location: PropTypes.object.isRequired,
  transaction: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};
