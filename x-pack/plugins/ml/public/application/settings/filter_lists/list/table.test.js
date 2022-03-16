/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Create a mock for the privilege check used within the table to
// enable/disable the 'New Filter' button.
jest.mock('../../../capabilities/check_capabilities', () => ({
  checkPermission: () => true,
}));
jest.mock('../../../services/ml_api_service', () => 'ml');

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { FilterListsTable } from './table';

describe('Filter Lists Table', () => {
  const setSelectedFilterLists = jest.fn(() => {});
  const refreshFilterLists = jest.fn(() => {});

  const requiredProps = {
    setSelectedFilterLists,
    refreshFilterLists,
    canCreateFilter: true,
    canDeleteFilter: true,
  };

  const testFilterLists = [
    {
      filter_id: 'safe_domains',
      description: 'List of known safe domains',
      item_count: 500,
      used_by: { jobs: ['dns_exfiltration'] },
    },
    {
      filter_id: 'us_east_instances',
      description: 'US East AWS instances',
      item_count: 20,
      used_by: { jobs: [] },
    },
  ];

  test('renders with filter lists supplied', () => {
    const props = {
      ...requiredProps,
      filterLists: testFilterLists,
    };

    const component = shallowWithIntl(<FilterListsTable {...props} />);

    expect(component).toMatchSnapshot();
  });

  test('renders with filter lists and selection supplied', () => {
    const props = {
      ...requiredProps,
      filterLists: testFilterLists,
      selectedFilterLists: [testFilterLists[0]],
    };

    const component = shallowWithIntl(<FilterListsTable {...props} />);

    expect(component).toMatchSnapshot();
  });
});
