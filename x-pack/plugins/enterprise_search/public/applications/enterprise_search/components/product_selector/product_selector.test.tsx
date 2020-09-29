/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/kea.mock';

import React from 'react';
import { useValues } from 'kea';
import { shallow } from 'enzyme';
import { EuiPage } from '@elastic/eui';

import { ProductSelector } from './';
import { ProductCard } from '../product_card';

describe('ProductSelector', () => {
  it('renders the overview page and product cards with no host set', () => {
    (useValues as jest.Mock).mockImplementationOnce(() => ({ config: { host: '' } }));
    const wrapper = shallow(<ProductSelector access={{}} />);

    expect(wrapper.find(EuiPage).hasClass('enterpriseSearchOverview')).toBe(true);
    expect(wrapper.find(ProductCard)).toHaveLength(2);
  });

  describe('access checks when host is set', () => {
    beforeEach(() => {
      (useValues as jest.Mock).mockImplementationOnce(() => ({ config: { host: 'localhost' } }));
    });

    it('does not render the App Search card if the user does not have access to AS', () => {
      const wrapper = shallow(
        <ProductSelector access={{ hasAppSearchAccess: false, hasWorkplaceSearchAccess: true }} />
      );

      expect(wrapper.find(ProductCard)).toHaveLength(1);
      expect(wrapper.find(ProductCard).prop('product').ID).toEqual('workplaceSearch');
    });

    it('does not render the Workplace Search card if the user does not have access to WS', () => {
      const wrapper = shallow(
        <ProductSelector access={{ hasAppSearchAccess: true, hasWorkplaceSearchAccess: false }} />
      );

      expect(wrapper.find(ProductCard)).toHaveLength(1);
      expect(wrapper.find(ProductCard).prop('product').ID).toEqual('appSearch');
    });

    it('does not render any cards if the user does not have access', () => {
      const wrapper = shallow(<ProductSelector access={{}} />);

      expect(wrapper.find(ProductCard)).toHaveLength(0);
    });
  });
});
