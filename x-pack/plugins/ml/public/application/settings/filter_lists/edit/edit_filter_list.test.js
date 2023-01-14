/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

// Define the required mocks used for loading, saving and validating the filter list.
jest.mock('./utils', () => ({
  isValidFilterListId: () => true,
  saveFilterList: jest.fn(),
}));

// Mock the call for loading the list of filters.
// The mock is hoisted to the top, so need to prefix the filter variable
// with 'mock' so it can be used lazily.
const mockTestFilter = {
  filter_id: 'safe_domains',
  description: 'List of known safe domains',
  items: ['google.com', 'google.co.uk', 'elastic.co', 'youtube.com'],
  used_by: {
    detectors: ['high info content'],
    jobs: ['dns_exfiltration'],
  },
};
jest.mock('../../../services/ml_api_service', () => ({
  ml: {
    filters: {
      filters: () => {
        return Promise.resolve(mockTestFilter);
      },
    },
  },
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (node) => {
    return node;
  },
}));

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { EditFilterList } from './edit_filter_list';

const props = {
  canCreateFilter: true,
  canDeleteFilter: true,
};

function prepareEditTest() {
  const wrapper = shallowWithIntl(<EditFilterList {...props} />);

  // Cannot find a way to generate the snapshot after the Promise in the mock ml.filters
  // has resolved.
  // So set the loaded filter state directly to ensure the snapshot is generated against
  // the test filter and not the default empty state.
  const instance = wrapper.instance();
  instance.setLoadedFilterState(mockTestFilter);
  wrapper.update();

  return wrapper;
}

describe('EditFilterList', () => {
  test('renders the edit page for a new filter list and updates ID', () => {
    const wrapper = shallowWithIntl(<EditFilterList {...props} />);
    expect(wrapper).toMatchSnapshot();

    const instance = wrapper.instance();
    instance.updateNewFilterId('new_filter_list');
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });

  test('renders the edit page for an existing filter list and updates description', () => {
    const wrapper = prepareEditTest();
    expect(wrapper).toMatchSnapshot();

    const instance = wrapper.instance();
    instance.updateDescription('Known safe web domains');
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });

  test('updates the items per page', () => {
    const wrapper = prepareEditTest();
    const instance = wrapper.instance();

    instance.setItemsPerPage(500);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });

  test('renders after selecting an item and deleting it', () => {
    const wrapper = prepareEditTest();
    const instance = wrapper.instance();

    instance.setItemSelected(mockTestFilter.items[1], true);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();

    instance.deleteSelectedItems();
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });

  test('adds new items to filter list', () => {
    const wrapper = prepareEditTest();
    const instance = wrapper.instance();

    instance.addItems(['amazon.com', 'spotify.com']);
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });
});
