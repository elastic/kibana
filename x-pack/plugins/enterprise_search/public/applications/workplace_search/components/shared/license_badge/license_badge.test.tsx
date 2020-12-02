/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiBadge } from '@elastic/eui';

import { LicenseBadge } from './';

describe('LicenseBadge', () => {
  it('renders', () => {
    const wrapper = shallow(<LicenseBadge />);

    expect(wrapper.find(EuiBadge)).toHaveLength(1);
    expect(wrapper.find('span').text()).toEqual('Platinum Feature');
  });
});
