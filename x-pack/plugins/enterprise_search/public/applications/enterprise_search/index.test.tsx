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
    const wrapper = shallow(
      <EnterpriseSearch access={{ hasAppSearchAccess: true, hasWorkplaceSearchAccess: true }} />
    );

    expect(wrapper.find(EuiPage).hasClass('enterpriseSearchOverview')).toBe(true);
    expect(wrapper.find(ProductCard)).toHaveLength(2);
  });

  describe('access checks', () => {
    it('does not render the App Search card if the user does not have access to AS', () => {
      const wrapper = shallow(
        <EnterpriseSearch access={{ hasAppSearchAccess: false, hasWorkplaceSearchAccess: true }} />
      );

      expect(wrapper.find(ProductCard)).toHaveLength(1);
      expect(wrapper.find(ProductCard).prop('product').ID).toEqual('workplaceSearch');
    });

    it('does not render the Workplace Search card if the user does not have access to WS', () => {
      const wrapper = shallow(
        <EnterpriseSearch access={{ hasAppSearchAccess: true, hasWorkplaceSearchAccess: false }} />
      );

      expect(wrapper.find(ProductCard)).toHaveLength(1);
      expect(wrapper.find(ProductCard).prop('product').ID).toEqual('appSearch');
    });

    it('does not render any cards if the user does not have access', () => {
      const wrapper = shallow(<EnterpriseSearch />);

      expect(wrapper.find(ProductCard)).toHaveLength(0);
    });
  });
});
