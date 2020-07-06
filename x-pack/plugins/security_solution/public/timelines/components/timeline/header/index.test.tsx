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
import { TimelineStatus } from '../../../../../common/types/timeline';

const mockUiSettingsForFilterManager = createKibanaCoreStartMock().uiSettings;

jest.mock('../../../../common/lib/kibana');

describe('Header', () => {
  const indexPattern = mockIndexPattern;
  const mount = useMountAppended();
  const props = {
    browserFields: {},
    dataProviders: mockDataProviders,
    filterManager: new FilterManager(mockUiSettingsForFilterManager),
    id: 'foo',
    indexPattern,
    onDataProviderEdited: jest.fn(),
    onDataProviderRemoved: jest.fn(),
    onToggleDataProviderEnabled: jest.fn(),
    onToggleDataProviderExcluded: jest.fn(),
    show: true,
    showCallOutUnauthorizedMsg: false,
    status: TimelineStatus.active,
  };

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(<TimelineHeader {...props} />);
      expect(wrapper).toMatchSnapshot();
    });

    test('it renders the data providers when show is true', () => {
      const testProps = { ...props, show: true };
      const wrapper = mount(
        <TestProviders>
          <TimelineHeader {...testProps} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toEqual(true);
    });

    test('it does NOT render the data providers when show is false', () => {
      const testProps = { ...props, show: false };

      const wrapper = mount(
        <TestProviders>
          <TimelineHeader {...testProps} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toEqual(false);
    });

    test('it renders the unauthorized call out providers', () => {
      const testProps = {
        ...props,
        filterManager: new FilterManager(mockUiSettingsForFilterManager),
        showCallOutUnauthorizedMsg: true,
      };

      const wrapper = mount(
        <TestProviders>
          <TimelineHeader {...testProps} />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timelineCallOutUnauthorized"]').exists()).toEqual(true);
    });
  });
});
