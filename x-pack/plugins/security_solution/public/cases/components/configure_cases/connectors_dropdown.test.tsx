/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { EuiSuperSelect } from '@elastic/eui';

import { ConnectorsDropdown, Props } from './connectors_dropdown';
import { TestProviders } from '../../../common/mock';
import { connectors } from './__mock__';

describe('ConnectorsDropdown', () => {
  let wrapper: ReactWrapper;
  const props: Props = {
    disabled: false,
    connectors,
    isLoading: false,
    onChange: jest.fn(),
    selectedConnector: 'none',
  };

  beforeAll(() => {
    wrapper = mount(<ConnectorsDropdown {...props} />, { wrappingComponent: TestProviders });
  });

  test('it renders', () => {
    expect(wrapper.find('[data-test-subj="dropdown-connectors"]').first().exists()).toBe(true);
  });

  test('it formats the connectors correctly', () => {
    const selectProps = wrapper.find(EuiSuperSelect).props();

    expect(selectProps.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'none',
          'data-test-subj': 'dropdown-connector-no-connector',
        }),
        expect.objectContaining({
          value: 'servicenow-1',
          'data-test-subj': 'dropdown-connector-servicenow-1',
        }),
        expect.objectContaining({
          value: 'servicenow-2',
          'data-test-subj': 'dropdown-connector-servicenow-2',
        }),
      ])
    );
  });

  test('it disables the dropdown', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} disabled={true} />, {
      wrappingComponent: TestProviders,
    });

    expect(
      newWrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('disabled')
    ).toEqual(true);
  });

  test('it loading correctly', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} isLoading={true} />, {
      wrappingComponent: TestProviders,
    });

    expect(
      newWrapper.find('[data-test-subj="dropdown-connectors"]').first().prop('isLoading')
    ).toEqual(true);
  });

  test('it selects the correct connector', () => {
    const newWrapper = mount(<ConnectorsDropdown {...props} selectedConnector={'servicenow-1'} />, {
      wrappingComponent: TestProviders,
    });

    expect(newWrapper.find('button span').text()).toEqual('My Connector');
  });
});
