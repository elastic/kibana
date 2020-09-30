/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiTableRow } from '@elastic/eui';

import { users } from '../../../__mocks__/users.mock';

import { UserRow } from './';

describe('SourcesTable', () => {
  it('renders', () => {
    const wrapper = shallow(<UserRow user={users[0]} />);

    expect(wrapper.find(EuiTableRow)).toHaveLength(1);
    expect(wrapper.find('span')).toHaveLength(0);
  });

  it('renders with email visible', () => {
    const wrapper = shallow(<UserRow user={users[0]} showEmail />);

    expect(wrapper.find('span')).toHaveLength(1);
  });
});
