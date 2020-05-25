/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { FilterLists } from './filter_lists';

jest.mock('../../../components/navigation_menu', () => ({
  NavigationMenu: () => <div id="mockNavigationMenu" />,
}));
jest.mock('../../../capabilities/check_capabilities', () => ({
  checkPermission: () => true,
}));

jest.mock('../../../../../../../../src/plugins/kibana_react/public', () => ({
  withKibana: (node) => {
    return node;
  },
}));

// Mock the call for loading the list of filters.
// The mock is hoisted to the top, so need to prefix the filter variable
// with 'mock' so it can be used lazily.
const mockTestFilter = {
  filter_id: 'safe_domains',
  description: 'List of known safe domains',
  item_count: 500,
  used_by: { jobs: ['dns_exfiltration'] },
};
jest.mock('../../../services/ml_api_service', () => ({
  ml: {
    filters: {
      filtersStats: () => {
        return Promise.resolve([mockTestFilter]);
      },
    },
  },
}));

const props = {
  canCreateFilter: true,
  canDeleteFilter: true,
};

describe('Filter Lists', () => {
  test('renders a list of filters', () => {
    const wrapper = shallowWithIntl(<FilterLists {...props} />);

    // Cannot find a way to generate the snapshot after the Promise in the mock ml.filters
    // has resolved.
    // So set the filter lists directly to ensure the snapshot is generated against
    // the test list and not the default empty state.
    wrapper.instance().setFilterLists([mockTestFilter]);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });
});
