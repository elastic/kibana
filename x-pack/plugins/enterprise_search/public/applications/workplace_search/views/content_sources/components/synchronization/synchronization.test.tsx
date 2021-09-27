/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiLink, EuiSwitch } from '@elastic/eui';

import { Synchronization } from './synchronization';

describe('Synchronization', () => {
  it('renders', () => {
    const wrapper = shallow(<Synchronization />);

    expect(wrapper.find(EuiLink)).toHaveLength(1);
    expect(wrapper.find(EuiSwitch)).toHaveLength(1);
  });
});
