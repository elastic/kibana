/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { ProductCard } from '../product_card';

import { WorkplaceSearchProductCard } from './workplace_search_product_card';

describe('WorkplaceSearchProductCard', () => {
  it('renders with url when admin', () => {
    const wrapper = shallow(
      <WorkplaceSearchProductCard hasBorder hasShadow isWorkplaceSearchAdmin />
    );

    expect(wrapper.find(ProductCard)).toHaveLength(1);
    expect(wrapper.find(ProductCard).prop('url')).toEqual(WORKPLACE_SEARCH_PLUGIN.URL);
  });
  it('renders with non-admin url when not admin', () => {
    const wrapper = shallow(
      <WorkplaceSearchProductCard hasBorder hasShadow isWorkplaceSearchAdmin={false} />
    );

    expect(wrapper.find(ProductCard)).toHaveLength(1);
    expect(wrapper.find(ProductCard).prop('url')).toEqual(WORKPLACE_SEARCH_PLUGIN.NON_ADMIN_URL);
  });
});
