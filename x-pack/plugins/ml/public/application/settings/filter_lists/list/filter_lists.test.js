/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { FilterLists } from './filter_lists';

jest.mock('../../../components/help_menu', () => ({
  HelpMenu: () => <div id="mockHelpMenu" />,
}));

jest.mock('../../../util/dependency_cache', () => ({
  getDocLinks: () => ({
    links: {
      ml: { customRules: jest.fn() },
    },
  }),
}));

jest.mock('../../../capabilities/check_capabilities', () => ({
  checkPermission: () => true,
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
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
