/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import { EuiButton } from '@elastic/eui';
import {
  PROCESSOR_EVENT,
  TRANSACTION_ID
} from '../../../../../common/constants';
import DiscoverButton from '../../../shared/DiscoverButton';
import StickyTransactionProperties from './StickyTransactionProperties';
import { TransactionPropertiesTable } from './TransactionPropertiesTable';
import EmptyMessage from '../../../shared/EmptyMessage';

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

function Transaction({ transaction, urlParams, location }) {
  if (isEmpty(transaction)) {
    return (
      <EmptyMessage
        heading="No transaction sample available."
        subheading="Try another time range, reset the search filter or select another bucket from the distribution histogram."
      />
    );
  }

  const isRootTransaction = true; // TODO: implement logic
  return (
    <div>
      {!isRootTransaction && <EuiButton>View trace</EuiButton>}

      <DiscoverButton query={getDiscoverQuery(transaction.transaction.id)}>
        {`View transaction in Discover`}
      </DiscoverButton>

      <StickyTransactionProperties transaction={transaction} />

      <TransactionPropertiesTable
        transaction={transaction}
        location={location}
        urlParams={urlParams}
      />
    </div>
  );
}

Transaction.propTypes = {
  location: PropTypes.object.isRequired,
  transaction: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired
};

export default Transaction;
