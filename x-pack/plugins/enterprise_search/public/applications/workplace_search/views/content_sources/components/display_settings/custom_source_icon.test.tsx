/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { CustomSourceIcon } from './custom_source_icon';

describe('CustomSourceIcon', () => {
  it('renders', () => {
    const wrapper = shallow(<CustomSourceIcon />);

    expect(wrapper.find('svg')).toHaveLength(1);
  });
});
