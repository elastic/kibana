/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { AppSearchLogo } from './app_search_logo';
import { WorkplaceSearchLogo } from './workplace_search_logo';

describe('product 404 logos', () => {
  it('renders an App Search logo', () => {
    const wrapper = shallow(<AppSearchLogo />);
    expect(wrapper.hasClass('logo404')).toBe(true);
  });

  it('renders a Workplace Search logo', () => {
    const wrapper = shallow(<WorkplaceSearchLogo />);
    expect(wrapper.hasClass('logo404')).toBe(true);
  });
});
