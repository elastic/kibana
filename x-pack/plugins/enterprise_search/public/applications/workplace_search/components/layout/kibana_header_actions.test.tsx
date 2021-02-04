/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { externalUrl } from '../../../shared/enterprise_search_url';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiButtonEmpty } from '@elastic/eui';

import { WorkplaceSearchHeaderActions } from './';

describe('WorkplaceSearchHeaderActions', () => {
  it('does not render without an Enterprise Search URL set', () => {
    const wrapper = shallow(<WorkplaceSearchHeaderActions />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders a link to the personal dashboard', () => {
    externalUrl.enterpriseSearchUrl = 'http://localhost:3002';

    const wrapper = shallow(<WorkplaceSearchHeaderActions />);

    expect(wrapper.find(EuiButtonEmpty).first().prop('href')).toEqual(
      'http://localhost:3002/ws/sources'
    );
  });

  it('renders a link to the search application', () => {
    externalUrl.enterpriseSearchUrl = 'http://localhost:3002';

    const wrapper = shallow(<WorkplaceSearchHeaderActions />);

    expect(wrapper.find(EuiButtonEmpty).last().prop('href')).toEqual(
      'http://localhost:3002/ws/search'
    );
  });
});
