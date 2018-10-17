/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import {
  PROCESSOR_EVENT,
  TRANSACTION_ID
} from '../../../../../common/constants';
// @ts-ignore
import DiscoverButton from '../../../shared/DiscoverButton';
import EmptyMessage from '../../../shared/EmptyMessage';
import { TraceLink } from '../../../shared/TraceLink';
// @ts-ignore
import { TransactionPropertiesTable } from './TransactionPropertiesTable';
import { TransactionSampleHeader } from './TransactionSampleHeader';

interface Props {
  transaction: any;
  urlParams: any;
  location: Location;
}

function getDiscoverQuery(transactionId: string) {
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

export const Transaction: React.SFC<Props> = ({
  transaction,
  urlParams,
  location
}) => {
  if (isEmpty(transaction)) {
    return (
      <EmptyMessage
        heading="No transaction sample available."
        subheading="Try another time range, reset the search filter or select another bucket from the distribution histogram."
      />
    );
  }

  const isRootTransaction = !transaction.parent;
  const buttonStyle: React.CSSProperties = {
    float: 'right',
    marginLeft: '10px'
  };
  return (
    <EuiPanel paddingSize="m" hasShadow={true}>
      <div>
        <EuiTitle size="s">
          <span>Transaction sample</span>
        </EuiTitle>

        {!isRootTransaction && (
          <TraceLink
            serviceName={transaction.context.service.name}
            transactionType={transaction.transaction.type}
            traceId={transaction.trace.id}
            transactionId={transaction.transaction.id} // bzzzzt this needs to be the ROOT transaction ID
            name={transaction.transaction.name}
          >
            <EuiButton iconType="apmApp" style={buttonStyle}>
              View full trace
            </EuiButton>
          </TraceLink>
        )}

        <DiscoverButton
          query={getDiscoverQuery(transaction.transaction.id)}
          style={buttonStyle}
        >
          {`View transaction in Discover`}
        </DiscoverButton>
      </div>

      <EuiSpacer />

      <TransactionSampleHeader transaction={transaction} />

      <TransactionPropertiesTable
        transaction={transaction}
        location={location}
        urlParams={urlParams}
      />
    </EuiPanel>
  );
};

Transaction.propTypes = {
  location: PropTypes.object.isRequired,
  transaction: PropTypes.object.isRequired,
  urlParams: PropTypes.object.isRequired
};
