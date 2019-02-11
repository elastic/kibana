/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import 'jest-styled-components';
import React from 'react';
import { TransactionActionMenu } from '../TransactionActionMenu';
import { props } from './transactionActionMenuProps';

describe('TransactionActionMenu component', () => {
  it('should render with data', () => {
    const transaction = props.transaction;
    const location = props.location;

    expect(
      shallow(
        <TransactionActionMenu transaction={transaction} location={location} />
      ).shallow()
    ).toMatchSnapshot();
  });
});
