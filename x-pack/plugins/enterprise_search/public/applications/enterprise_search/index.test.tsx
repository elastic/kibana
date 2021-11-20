/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { rerender } from '../test_helpers';

import { ErrorConnecting } from './components/error_connecting';
import { ProductSelector } from './components/product_selector';
import { SetupGuide } from './components/setup_guide';

import { EnterpriseSearch } from './';

describe('EnterpriseSearch', () => {
  it('renders the Setup Guide and Product Selector', () => {
    setMockValues({
      errorConnecting: false,
      config: { host: 'localhost' },
    });
    const wrapper = shallow(<EnterpriseSearch />);

    expect(wrapper.find(SetupGuide)).toHaveLength(1);
    expect(wrapper.find(ProductSelector)).toHaveLength(1);
  });

  it('renders the error connecting prompt only if host is configured', () => {
    setMockValues({
      errorConnecting: true,
      config: { host: 'localhost' },
    });
    const wrapper = shallow(<EnterpriseSearch />);

    expect(wrapper.find(ErrorConnecting)).toHaveLength(1);
    expect(wrapper.find(ProductSelector)).toHaveLength(0);

    setMockValues({
      errorConnecting: true,
      config: { host: '' },
    });
    rerender(wrapper);

    expect(wrapper.find(ErrorConnecting)).toHaveLength(0);
    expect(wrapper.find(ProductSelector)).toHaveLength(1);
  });
});
