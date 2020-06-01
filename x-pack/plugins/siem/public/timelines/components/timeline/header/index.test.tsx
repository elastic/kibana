/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { mockIndexPattern } from '../../../../common/mock';
import { createKibanaCoreStartMock } from '../../../../common/mock/kibana_core';
import { TestProviders } from '../../../../common/mock/test_providers';
import { FilterManager } from '../../../../../../../../src/plugins/data/public';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';

import { TimelineHeader } from '.';

const mockUiSettingsForFilterManager = createKibanaCoreStartMock().uiSettings;

jest.mock('../../../../common/lib/kibana');

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

    test('it renders the data providers when show is true', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineHeader
            browserFields={{}}
            dataProviders={mockDataProviders}
            filterManager={new FilterManager(mockUiSettingsForFilterManager)}
            id="foo"
            indexPattern={indexPattern}
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

    test('it does NOT render the data providers when show is false', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineHeader
            browserFields={{}}
            dataProviders={mockDataProviders}
            filterManager={new FilterManager(mockUiSettingsForFilterManager)}
            id="foo"
            indexPattern={indexPattern}
            onDataProviderEdited={jest.fn()}
            onDataProviderRemoved={jest.fn()}
            onToggleDataProviderEnabled={jest.fn()}
            onToggleDataProviderExcluded={jest.fn()}
            show={false}
            showCallOutUnauthorizedMsg={false}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toEqual(false);
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
