/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { mount } from 'enzyme';

import { AppSearchProductCard } from './app_search_product_card';
import { EnterpriseSearchProductCard } from './enterprise_search_product_card';
import { WorkplaceSearchProductCard } from './workplace_search_product_card';

describe('EnterpriseSearchProductCard', () => {
  beforeEach(() => {
    setMockValues({ config: { canDeployEntSearch: true, host: 'localhost' } });
  });

  it('renders both services with access', () => {
    const wrapper = mount(
      <EnterpriseSearchProductCard
        hasAppSearchAccess
        hasWorkplaceSearchAccess
        isWorkplaceSearchAdmin
      />
    );

    expect(wrapper.find(AppSearchProductCard)).toHaveLength(1);
    expect(wrapper.find(WorkplaceSearchProductCard)).toHaveLength(1);
  });
  it('can render just app search', () => {
    const wrapper = mount(
      <EnterpriseSearchProductCard
        hasAppSearchAccess
        hasWorkplaceSearchAccess={false}
        isWorkplaceSearchAdmin={false}
      />
    );

    expect(wrapper.find(AppSearchProductCard)).toHaveLength(1);
    expect(wrapper.find(WorkplaceSearchProductCard)).toHaveLength(0);
  });
  it('can render just workplace search', () => {
    const wrapper = mount(
      <EnterpriseSearchProductCard
        hasAppSearchAccess={false}
        hasWorkplaceSearchAccess
        isWorkplaceSearchAdmin
      />
    );

    expect(wrapper.find(AppSearchProductCard)).toHaveLength(0);
    expect(wrapper.find(WorkplaceSearchProductCard)).toHaveLength(1);
  });
});
