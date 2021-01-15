/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { setMockValues, rerender } from '../__mocks__';

import { EnterpriseSearch } from './';
import { SetupGuide } from './components/setup_guide';
import { ErrorConnecting } from './components/error_connecting';
import { ProductSelector } from './components/product_selector';

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
