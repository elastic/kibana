/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { externalUrl } from '../../../shared/enterprise_search_url';

import { WorkplaceSearchHeaderActions } from '.';

describe('WorkplaceSearchHeaderActions', () => {
  const ENT_SEARCH_URL = 'http://localhost:3002';

  it('does not render without an Enterprise Search URL set', () => {
    const wrapper = shallow(<WorkplaceSearchHeaderActions />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('renders a link to the personal dashboard', () => {
    externalUrl.enterpriseSearchUrl = ENT_SEARCH_URL;
    const wrapper = shallow(<WorkplaceSearchHeaderActions />);

    expect(wrapper.find('[data-test-subj="PersonalDashboardButton"]').prop('to')).toEqual(
      '/p/sources'
    );
  });

  it('renders a link to the search application', () => {
    externalUrl.enterpriseSearchUrl = ENT_SEARCH_URL;
    const wrapper = shallow(<WorkplaceSearchHeaderActions />);

    expect(wrapper.find('[data-test-subj="HeaderSearchButton"]').prop('href')).toEqual(
      'http://localhost:3002/ws/search'
    );
  });
});
