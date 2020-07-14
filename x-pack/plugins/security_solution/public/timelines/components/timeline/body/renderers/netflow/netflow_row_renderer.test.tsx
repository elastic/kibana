/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { BrowserFields } from '../../../../../../common/containers/source';
import { mockBrowserFields } from '../../../../../../common/containers/source/mock';
import { Ecs } from '../../../../../../graphql/types';
import { getMockNetflowData, TestProviders } from '../../../../../../common/mock';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';

import {
  eventActionMatches,
  eventCategoryMatches,
  netflowRowRenderer,
} from './netflow_row_renderer';

export const justIdAndTimestamp: Ecs = {
  _id: 'abcd',
  timestamp: '2018-11-12T19:03:25.936Z',
};

jest.mock('../../../../../../common/components/link_to');

describe('netflowRowRenderer', () => {
  const mount = useMountAppended();

  test('renders correctly against snapshot', () => {
    const browserFields: BrowserFields = {};
    const children = netflowRowRenderer.renderRow({
      browserFields,
      data: getMockNetflowData(),
      timelineId: 'test',
    });

    const wrapper = shallow(<span>{children}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  describe('#isInstance', () => {
    test('it should return false if the data is not an instance that can be rendered', () => {
      expect(netflowRowRenderer.isInstance(justIdAndTimestamp)).toBe(false);
    });

    test('it should return true the data is an instance that can be rendered', () => {
      expect(netflowRowRenderer.isInstance(getMockNetflowData())).toBe(true);
    });
  });

  describe('#eventCategoryMatches', () => {
    test('it returns true when event.category is network_traffic', () => {
      expect(eventCategoryMatches('network_traffic')).toBe(true);
    });

    test('it returns false when event.category is NOT network_traffic', () => {
      expect(eventCategoryMatches('another category')).toBe(false);
    });

    test('it returns false when event.category is a random object', () => {
      expect(eventCategoryMatches({ random: true })).toBe(false);
    });

    test('it returns false when event.category is a undefined', () => {
      expect(eventCategoryMatches(undefined)).toBe(false);
    });

    test('it returns false when event.category is null', () => {
      expect(eventCategoryMatches(null)).toBe(false);
    });
  });

  describe('#eventActionMatches', () => {
    test('it returns true when event.action is network_flow', () => {
      expect(eventActionMatches('network_flow')).toBe(true);
    });

    test('it returns true when event.action is netflow_flow', () => {
      expect(eventActionMatches('netflow_flow')).toBe(true);
    });

    test('it returns false when event.action is NOT network_flow, netflow_flow, or socket_opened', () => {
      expect(eventActionMatches('another action')).toBe(false);
    });

    test('it returns false when event.action is a random object', () => {
      expect(eventActionMatches({ random: true })).toBe(false);
    });

    test('it returns false when event.action is a undefined', () => {
      expect(eventActionMatches(undefined)).toBe(false);
    });

    test('it returns false when event.action is null', () => {
      expect(eventActionMatches(null)).toBe(false);
    });
  });

  test('should render netflow data', () => {
    const children = netflowRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: getMockNetflowData(),
      timelineId: 'test',
    });
    const wrapper = mount(
      <TestProviders>
        <span>{children}</span>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="destination-bytes"]').first().text()).toEqual('40B');
  });
});
