/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { TestProviders } from '../../../mock/test_providers';

import { DataProviders } from '.';
import { DataProvider } from './data_provider';
import { mockDataProviders } from './mock/mock_data_providers';

describe('DataProviders', () => {
  describe('rendering', () => {
    const dropMessage = ['Drop', 'query', 'build', 'here'];

    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <DataProviders
          id="foo"
          dataProviders={mockDataProviders}
          onChangeDataProviderKqlQuery={jest.fn()}
          onChangeDroppableAndProvider={jest.fn()}
          onDataProviderRemoved={jest.fn()}
          onToggleDataProviderEnabled={jest.fn()}
          onToggleDataProviderExcluded={jest.fn()}
          show={true}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it should render a placeholder when there are zero data providers', () => {
      const dataProviders: DataProvider[] = [];

      const wrapper = mount(
        <TestProviders>
          <DataProviders
            id="foo"
            dataProviders={dataProviders}
            onChangeDataProviderKqlQuery={jest.fn()}
            onChangeDroppableAndProvider={jest.fn()}
            onDataProviderRemoved={jest.fn()}
            onToggleDataProviderEnabled={jest.fn()}
            onToggleDataProviderExcluded={jest.fn()}
            show={true}
          />
        </TestProviders>
      );

      dropMessage.forEach(word => expect(wrapper.text()).toContain(word));
    });

    test('it should STILL render a placeholder given a non-empty collection of data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <DataProviders
            id="foo"
            dataProviders={mockDataProviders}
            onChangeDataProviderKqlQuery={jest.fn()}
            onChangeDroppableAndProvider={jest.fn()}
            onDataProviderRemoved={jest.fn()}
            onToggleDataProviderEnabled={jest.fn()}
            onToggleDataProviderExcluded={jest.fn()}
            show={true}
          />
        </TestProviders>
      );

      dropMessage.forEach(word => expect(wrapper.text()).toContain(word));
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <DataProviders
            id="foo"
            dataProviders={mockDataProviders}
            onChangeDataProviderKqlQuery={jest.fn()}
            onChangeDroppableAndProvider={jest.fn()}
            onDataProviderRemoved={jest.fn()}
            onToggleDataProviderEnabled={jest.fn()}
            onToggleDataProviderExcluded={jest.fn()}
            show={true}
          />
        </TestProviders>
      );

      mockDataProviders.forEach(dataProvider =>
        expect(wrapper.text()).toContain(
          dataProvider.queryMatch.displayValue || dataProvider.queryMatch.value
        )
      );
    });
  });
});
