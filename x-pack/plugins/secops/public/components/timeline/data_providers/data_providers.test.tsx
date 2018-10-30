/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as fp from 'lodash/fp';
import * as React from 'react';
import { DataProvider } from './data_provider';
import { DataProviders } from './data_providers';
import {
  getEventCount,
  mockDataProviderNames,
  mockDataProviders,
} from './mock/mock_data_providers';

describe('DataProviders', () => {
  describe('rendering', () => {
    test('it should render a placeholder when there are zero data providers', () => {
      const dataProviders: DataProvider[] = [];

      const wrapper = mount(
        <DataProviders dataProviders={dataProviders} onDataProviderRemoved={fp.noop} />
      );

      expect(wrapper.text()).toContain('Drop anything with a Facet count here');
    });

    test('it should NOT render a placeholder given a non-empty collection of data providers', () => {
      const wrapper = mount(
        <DataProviders dataProviders={mockDataProviders} onDataProviderRemoved={fp.noop} />
      );

      expect(wrapper.text()).not.toContain('Drop anything with a Facet count here');
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
        <DataProviders dataProviders={mockDataProviders} onDataProviderRemoved={fp.noop} />
      );

      mockDataProviderNames().forEach(name =>
        expect(wrapper.text()).toContain(`${name} ${getEventCount(name)}`)
      );
    });
  });
});
