/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiPage } from '@elastic/eui';

import { EnterpriseSearch } from './';
import { ProductCard } from './components/product_card';

describe('EnterpriseSearch', () => {
  it('renders the overview page and product cards', () => {
    const wrapper = shallow(<EnterpriseSearch />);

    expect(wrapper.find(EuiPage)).toHaveLength(1);
    expect(wrapper.find(ProductCard)).toHaveLength(2);
  });
});
