/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { noop, pick } from 'lodash/fp';
import * as React from 'react';
import {
  getEventCount,
  mockDataProviderNames,
  mockDataProviders,
} from './mock/mock_data_providers';
import { Providers } from './providers';

describe('Providers', () => {
  describe('rendering', () => {
    test('it renders the data providers', () => {
      const wrapper = mount(
        <Providers
          dataProviders={mockDataProviders}
          onDataProviderRemoved={noop}
          onToggleDataProviderEnabled={noop}
        />
      );

      mockDataProviderNames().forEach(name =>
        expect(wrapper.text()).toContain(`${getEventCount(name)} ${name}`)
      );
    });
  });

  describe('#onDataProviderRemoved', () => {
    test('it invokes the onDataProviderRemoved callback when the close button is clicked', () => {
      const mockOnDataProviderRemoved = jest.fn();

      const wrapper = mount(
        <Providers
          dataProviders={mockDataProviders}
          onDataProviderRemoved={mockOnDataProviderRemoved}
          onToggleDataProviderEnabled={noop}
        />
      );

      wrapper
        .find('[data-test-subj="closeButton"]')
        .first()
        .simulate('click');

      const callbackParams = pick(
        ['enabled', 'id', 'name', 'negated'],
        mockOnDataProviderRemoved.mock.calls[0][0]
      );

      expect(callbackParams).toEqual({
        enabled: true,
        id: 'id-Provider 1',
        name: 'Provider 1',
        negated: false,
      });
    });
  });

  describe('#onToggleDataProviderEnabled', () => {
    test('it invokes the onToggleDataProviderEnabled callback when the switch button is clicked', () => {
      const mockOnToggleDataProviderEnabled = jest.fn();

      const wrapper = mount(
        <Providers
          dataProviders={mockDataProviders}
          onDataProviderRemoved={noop}
          onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
        />
      );

      wrapper
        .find('[data-test-subj="switchButton"]')
        .at(1)
        .simulate('click');

      const callbackParams = pick(
        ['enabled', 'dataProvider.id', 'dataProvider.name', 'dataProvider.negated'],
        mockOnToggleDataProviderEnabled.mock.calls[0][0]
      );

      expect(callbackParams).toEqual({
        dataProvider: {
          name: 'Provider 1',
          negated: false,
          id: 'id-Provider 1',
        },
        enabled: false,
      });
    });
  });
});
