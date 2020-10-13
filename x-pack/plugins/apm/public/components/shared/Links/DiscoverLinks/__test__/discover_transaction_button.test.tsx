/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Transaction } from '../../../../../../typings/es_schemas/ui/transaction';
import {
  DiscoverTransactionLink,
  getDiscoverQuery,
} from '../DiscoverTransactionLink';
import mockTransaction from './mock_transaction.json';

describe('DiscoverTransactionLink component', () => {
  it('should render with data', () => {
    const transaction = mockTransaction as Transaction;

    expect(
      shallow(<DiscoverTransactionLink transaction={transaction} />)
    ).toMatchSnapshot();
  });
});

describe('getDiscoverQuery', () => {
  it('should return the correct query params object', () => {
    const transaction = mockTransaction as Transaction;
    const result = getDiscoverQuery(transaction);
    expect(result).toMatchSnapshot();
  });
});
