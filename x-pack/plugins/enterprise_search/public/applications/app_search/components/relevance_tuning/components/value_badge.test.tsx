/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { ValueBadge } from '.';

describe('ValueBadge', () => {
  it('renders', () => {
    const wrapper = shallow(<ValueBadge>Hello world</ValueBadge>);
    expect(wrapper.hasClass('valueBadge')).toBe(true);
    expect(wrapper.text()).toEqual('Hello world');
  });

  it('renders a disabled class', () => {
    const wrapper = shallow(<ValueBadge disabled>Test</ValueBadge>);
    expect(wrapper.hasClass('valueBadge--disabled')).toBe(true);
  });
});
