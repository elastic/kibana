/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import 'jest-styled-components';
import React from 'react';
import { TransactionActionMenu } from '../TransactionActionMenu';
import { transaction } from './mockData';

describe('TransactionActionMenu component', () => {
  it('should render with data', () => {
    expect(
      shallow(<TransactionActionMenu transaction={transaction} />).shallow()
    ).toMatchSnapshot();
  });
});
