/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlyout } from '@elastic/eui';

import { QueryTester } from './query_tester';
import { QueryTesterFlyout } from './query_tester_flyout';

describe('QueryTesterFlyout', () => {
  const onClose = jest.fn();

  it('renders', () => {
    const wrapper = shallow(<QueryTesterFlyout onClose={onClose} />);
    expect(wrapper.find(QueryTester).exists()).toBe(true);
    expect(wrapper.find(EuiFlyout).prop('onClose')).toEqual(onClose);
  });
});
