/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import 'jest-styled-components';
import React from 'react';
import { Transaction } from '../../../../../../typings/es_schemas/ui/Transaction';
import {
  DiscoverTransactionLink,
  getDiscoverQuery
} from '../DiscoverTransactionLink';
import mockTransaction from './mockTransaction.json';

jest.mock('ui/kfetch');

describe('DiscoverTransactionLink component', () => {
  it('should render with data', () => {
    const transaction: Transaction = mockTransaction;

    expect(
      shallow(<DiscoverTransactionLink transaction={transaction} />)
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
