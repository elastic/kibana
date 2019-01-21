/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { Location } from 'history';
import 'jest-styled-components';
import React from 'react';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';
import { TransactionActionMenu } from '../TransactionActionMenu';
import transactionActionMenuProps from './transactionActionMenuProps.json';

describe('TransactionActionMenu component', () => {
  it('should render with data', () => {
    const transaction: Transaction = transactionActionMenuProps.transaction;
    const location: Location = transactionActionMenuProps.location;

    expect(
      shallow(
        <TransactionActionMenu transaction={transaction} location={location} />
      ).shallow()
    ).toMatchSnapshot();
  });
});
