/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiText } from '@elastic/eui';

import { UserAddedInfo } from './';

describe('UserAddedInfo', () => {
  const props = {
    username: 'user1',
    email: 'test@test.com',
    roleType: 'user',
  };

  it('renders', () => {
    const wrapper = shallow(<UserAddedInfo {...props} />);

    expect(wrapper.find(EuiText)).toHaveLength(6);
  });
});
