/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as fp from 'lodash/fp';
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
        <Providers dataProviders={mockDataProviders} onDataProviderRemoved={fp.noop} />
      );

      mockDataProviderNames().forEach(name =>
        expect(wrapper.text()).toContain(`${name} ${getEventCount(name)}`)
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
        />
      );

      wrapper
        .find('[data-test-subj="closeButton"]')
        .first()
        .simulate('click');

      const callbackParams = fp.omit('render', mockOnDataProviderRemoved.mock.calls[0][0]);

      expect(callbackParams).toEqual({
        enabled: true,
        id: 'id-Provider 1',
        name: 'Provider 1',
        negated: false,
      });
    });
  });
});
