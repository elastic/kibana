/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';

import { DataProviders } from '.';
import { DataProvider } from './data_provider';
import { mockDataProviders } from './mock/mock_data_providers';
import { ManageGlobalTimeline, timelineDefaults } from '../../manage_timeline';
import { FilterManager } from '../../../../../../../../src/plugins/data/public/query/filter_manager';
import { createKibanaCoreStartMock } from '../../../../common/mock/kibana_core';
const mockUiSettingsForFilterManager = createKibanaCoreStartMock().uiSettings;

const filterManager = new FilterManager(mockUiSettingsForFilterManager);
describe('DataProviders', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    const dropMessage = ['Drop', 'query', 'build', 'here'];

    test('renders correctly against snapshot', () => {
      const manageTimelineForTesting = {
        foo: {
          ...timelineDefaults,
          id: 'foo',
          filterManager,
        },
      };
      const wrapper = shallow(
        <TestProviders>
          <ManageGlobalTimeline manageTimelineForTesting={manageTimelineForTesting}>
            <DataProviders
              browserFields={{}}
              id="foo"
              data-test-subj="dataProviders-container"
              dataProviders={mockDataProviders}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
            />
          </ManageGlobalTimeline>
        </TestProviders>
      );
      expect(wrapper.find(`[data-test-subj="dataProviders-container"]`).dive()).toMatchSnapshot();
    });

    test('it should render a placeholder when there are zero data providers', () => {
      const dataProviders: DataProvider[] = [];

      const wrapper = mount(
        <TestProviders>
          <DataProviders
            browserFields={{}}
            id="foo"
            dataProviders={dataProviders}
            onDataProviderEdited={jest.fn()}
            onDataProviderRemoved={jest.fn()}
            onToggleDataProviderEnabled={jest.fn()}
            onToggleDataProviderExcluded={jest.fn()}
          />
        </TestProviders>
      );

      dropMessage.forEach((word) => expect(wrapper.text()).toContain(word));
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <DataProviders
            browserFields={{}}
            id="foo"
            dataProviders={mockDataProviders}
            onDataProviderEdited={jest.fn()}
            onDataProviderRemoved={jest.fn()}
            onToggleDataProviderEnabled={jest.fn()}
            onToggleDataProviderExcluded={jest.fn()}
          />
        </TestProviders>
      );

      mockDataProviders.forEach((dataProvider) =>
        expect(wrapper.text()).toContain(
          dataProvider.queryMatch.displayValue || dataProvider.queryMatch.value
        )
      );
    });
  });
});
