/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { TimelineNonEcsData } from '../../../../../graphql/types';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../../../../common/mock';
import { getEmptyValue } from '../../../../../common/components/empty_value';
import { useMountAppended } from '../../../../../common/utils/use_mount_appended';

import { plainColumnRenderer } from './plain_column_renderer';
import { getValues, deleteItemIdx, findItem } from './helpers';

describe('plain_column_renderer', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    let mockDatum: TimelineNonEcsData[];
    const _id = mockTimelineData[0]._id;
    beforeEach(() => {
      mockDatum = cloneDeep(mockTimelineData[0].data);
    });

    test('renders correctly against snapshot', () => {
      const column = plainColumnRenderer.renderColumn({
        columnName: 'event.category',
        eventId: _id,
        values: getValues('event.category', mockDatum),
        field: defaultHeaders.find((h) => h.id === 'event.category')!,
        timelineId: 'test',
      });
      const wrapper = shallow(<span>{column}</span>);
      expect(wrapper).toMatchSnapshot();
    });

    test('should return isInstance false if source is empty', () => {
      mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'source.ip'));
      expect(plainColumnRenderer.isInstance('source.ip', mockDatum)).toBe(false);
    });

    test('should return isInstance true if source is NOT empty', () => {
      expect(plainColumnRenderer.isInstance('source.ip', mockDatum)).toBe(true);
    });

    test('should return isInstance false if it encounters a column it does not know about', () => {
      expect(plainColumnRenderer.isInstance('made up name', mockDatum)).toBe(false);
    });

    test('should return the value of event.category if event.category has a valid value', () => {
      const column = plainColumnRenderer.renderColumn({
        columnName: 'event.category',
        eventId: _id,
        values: getValues('event.category', mockDatum),
        field: defaultHeaders.find((h) => h.id === 'event.category')!,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{column}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Access');
    });

    test('should return the value of destination.ip if destination.ip has a valid value', () => {
      const column = plainColumnRenderer.renderColumn({
        columnName: 'destination.ip',
        eventId: _id,
        values: getValues('destination.ip', mockDatum),
        field: defaultHeaders.find((h) => h.id === 'destination.ip')!,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{column}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('192.168.0.3');
    });

    test('should return the value of destination.bytes if destination.bytes has a valid value', () => {
      const column = plainColumnRenderer.renderColumn({
        columnName: 'destination.bytes',
        eventId: _id,
        values: getValues('destination.bytes', mockDatum),
        field: defaultHeaders.find((h) => h.id === 'destination.bytes')!,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{column}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('120.6KB');
    });

    test('should return the value of event.action if event has a valid value', () => {
      const column = plainColumnRenderer.renderColumn({
        columnName: 'event.action',
        eventId: _id,
        values: getValues('event.action', mockDatum),
        field: defaultHeaders.find((h) => h.id === 'event.action')!,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{column}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Action');
    });

    test('should return the time formatted as per Kibana advanced settings if timestamp has a valid value', () => {
      const column = plainColumnRenderer.renderColumn({
        columnName: '@timestamp',
        eventId: _id,
        values: getValues('@timestamp', mockDatum),
        field: defaultHeaders.find((h) => h.id === '@timestamp')!,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{column}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('Nov 5, 2018 @ 19:03:25.937');
    });

    test('should return an empty value if destination ip is empty', () => {
      mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'destination.ip'));
      const emptyColumn = plainColumnRenderer.renderColumn({
        columnName: 'destination.ip',
        eventId: _id,
        values: getValues('destination.ip', mockDatum),
        field: defaultHeaders.find((h) => h.id === 'destination.ip')!,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{emptyColumn}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('should return an empty value if event severity is empty', () => {
      mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'event.severity'));
      const emptyColumn = plainColumnRenderer.renderColumn({
        columnName: 'event.severity',
        eventId: _id,
        values: getValues('event.severity', mockDatum),
        field: defaultHeaders.find((h) => h.id === 'event.severity')!,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{emptyColumn}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(getEmptyValue());
    });

    test('should render a message text', () => {
      const mockMessageDatum = cloneDeep(mockTimelineData[30].data);
      const column = plainColumnRenderer.renderColumn({
        columnName: 'message',
        eventId: _id,
        values: getValues('message', mockMessageDatum),
        field: defaultHeaders.find((h) => h.id === 'message')!,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{column}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('I am a log file message');
    });

    test('should NOT render a message as a draggable', () => {
      const mockMessageDatum = cloneDeep(mockTimelineData[30].data);
      const column = plainColumnRenderer.renderColumn({
        columnName: 'message',
        eventId: _id,
        values: getValues('message', mockMessageDatum),
        field: defaultHeaders.find((h) => h.id === 'message')!,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{column}</span>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggableWrapperDiv"]').first().exists()).toBe(false);
    });

    test('should render a _id as a draggable', () => {
      const column = plainColumnRenderer.renderColumn({
        columnName: '_id',
        eventId: _id,
        values: [mockTimelineData[0]._id],
        field: defaultHeaders.find((h) => h.id === '_id')!,
        timelineId: 'test',
      });
      const wrapper = mount(
        <TestProviders>
          <span>{column}</span>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="draggableWrapperDiv"]').first().exists()).toBe(true);
    });
  });
});
