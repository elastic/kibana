/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Create a mock for the canDeleteFilter privilege check.
// The mock is hoisted to the top, so need to prefix the mock function
// with 'mock' so it can be used lazily.
const mockCheckPermission = jest.fn(() => true);
jest.mock('../../../../capabilities/check_capabilities', () => ({
  checkPermission: (privilege) => mockCheckPermission(privilege),
}));
jest.mock('../../../../services/ml_api_service', () => 'ml');

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { DeleteFilterListModal } from './delete_filter_list_modal';

const testSelectedLists = [{ filter_id: 'web_domains' }, { filter_id: 'test_instances' }];

const testProps = {
  selectedFilterLists: testSelectedLists,
  canDeleteFilter: true,
};

describe('DeleteFilterListModal', () => {
  test('renders as disabled delete button when no lists selected', () => {
    const component = shallowWithIntl(<DeleteFilterListModal {...testProps} />);

    expect(component).toMatchSnapshot();
  });

  test('renders as enabled delete button when a list is selected', () => {
    const component = shallowWithIntl(<DeleteFilterListModal {...testProps} />);

    expect(component).toMatchSnapshot();
  });

  test('renders modal after clicking delete button', () => {
    const wrapper = shallowWithIntl(<DeleteFilterListModal {...testProps} />);
    wrapper.find('EuiButton').simulate('click');
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });

  test('renders as delete button after opening and closing modal', () => {
    const wrapper = shallowWithIntl(<DeleteFilterListModal {...testProps} />);
    wrapper.find('EuiButton').simulate('click');
    const instance = wrapper.instance();
    instance.closeModal();
    wrapper.update();
    expect(wrapper).toMatchSnapshot();
  });
});

describe('DeleteFilterListModal false canDeleteFilter privilege', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('renders as disabled delete button', () => {
    mockCheckPermission.mockImplementationOnce(() => {
      return false;
    });

    const component = shallowWithIntl(<DeleteFilterListModal {...testProps} />);

    expect(component).toMatchSnapshot();
  });
});
