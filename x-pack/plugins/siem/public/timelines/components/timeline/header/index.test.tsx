/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { mockIndexPattern } from '../../../mock';
import { createKibanaCoreStartMock } from '../../../mock/kibana_core';
import { TestProviders } from '../../../mock/test_providers';
import { FilterManager } from '../../../../../../../src/plugins/data/public';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { useMountAppended } from '../../../utils/use_mount_appended';

import { TimelineHeader } from '.';

const mockUiSettingsForFilterManager = createKibanaCoreStartMock().uiSettings;

jest.mock('../../../lib/kibana');

describe('Header', () => {
  const indexPattern = mockIndexPattern;
  const mount = useMountAppended();

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TimelineHeader
          browserFields={{}}
          dataProviders={mockDataProviders}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          id="foo"
          indexPattern={indexPattern}
          onChangeDataProviderKqlQuery={jest.fn()}
          onChangeDroppableAndProvider={jest.fn()}
          onDataProviderEdited={jest.fn()}
          onDataProviderRemoved={jest.fn()}
          onToggleDataProviderEnabled={jest.fn()}
          onToggleDataProviderExcluded={jest.fn()}
          show={true}
          showCallOutUnauthorizedMsg={false}
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineHeader
            browserFields={{}}
            dataProviders={mockDataProviders}
            filterManager={new FilterManager(mockUiSettingsForFilterManager)}
            id="foo"
            indexPattern={indexPattern}
            onChangeDataProviderKqlQuery={jest.fn()}
            onChangeDroppableAndProvider={jest.fn()}
            onDataProviderEdited={jest.fn()}
            onDataProviderRemoved={jest.fn()}
            onToggleDataProviderEnabled={jest.fn()}
            onToggleDataProviderExcluded={jest.fn()}
            show={true}
            showCallOutUnauthorizedMsg={false}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toEqual(true);
    });

    test('it renders the unauthorized call out providers', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineHeader
            browserFields={{}}
            dataProviders={mockDataProviders}
            filterManager={new FilterManager(mockUiSettingsForFilterManager)}
            id="foo"
            indexPattern={indexPattern}
            onChangeDataProviderKqlQuery={jest.fn()}
            onChangeDroppableAndProvider={jest.fn()}
            onDataProviderEdited={jest.fn()}
            onDataProviderRemoved={jest.fn()}
            onToggleDataProviderEnabled={jest.fn()}
            onToggleDataProviderExcluded={jest.fn()}
            show={true}
            showCallOutUnauthorizedMsg={true}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timelineCallOutUnauthorized"]').exists()).toEqual(true);
    });
  });
});
