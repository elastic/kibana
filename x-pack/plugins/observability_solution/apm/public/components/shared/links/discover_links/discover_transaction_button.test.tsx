/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import {
  DiscoverTransactionLink,
  getDiscoverQuery,
} from './discover_transaction_link';
import mockTransaction from './__fixtures__/mock_transaction.json';

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
