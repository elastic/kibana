/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import 'jest-styled-components';
import React from 'react';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import {
  DiscoverTransactionButton,
  getDiscoverQuery
} from '../DiscoverTransactionButton';
import mockTransaction from './mockTransaction.json';

describe('DiscoverTransactionButton component', () => {
  it('should render with data', () => {
    const transaction: Transaction = mockTransaction;

    expect(
      shallow(<DiscoverTransactionButton transaction={transaction} />)
    ).toMatchSnapshot();
  });
});

describe('getDiscoverQuery', () => {
  it('should return the correct query params object', () => {
    const transaction: Transaction = mockTransaction;
    const result = getDiscoverQuery(transaction);
    expect(result).toMatchSnapshot();
  });
});
