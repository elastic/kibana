/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep, get } from 'lodash/fp';
import moment from 'moment-timezone';
import * as React from 'react';

import { Ecs } from '../../../../graphql/types';
import { defaultHeaders, mockEcsData, mockFrameworks, TestProviders } from '../../../../mock';
import { getEmptyValue } from '../../../empty_value';

import { plainColumnRenderer } from '.';

const mockFramework = mockFrameworks.default_UTC;

describe('plain_column_renderer', () => {
  let mockDatum: Ecs;

  beforeEach(() => {
    mockDatum = cloneDeep(mockEcsData[0]);
  });

  test('renders correctly against snapshot', () => {
    const column = plainColumnRenderer.renderColumn({
      columnName: 'event.category',
      eventId: mockDatum._id,
      value: get('event.category', mockDatum),
      field: defaultHeaders.find(h => h.id === 'event.category')!,
    });
    const wrapper = shallow(<span>{column}</span>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('should return isInstance false if source is empty', () => {
    delete mockDatum.source;
    expect(plainColumnRenderer.isInstance('source', mockDatum)).toBe(false);
  });

  test('should return isInstance true if source is NOT empty', () => {
    expect(plainColumnRenderer.isInstance('source', mockDatum)).toBe(true);
  });

  test('should return isInstance false if it encounters a column it does not know about', () => {
    expect(plainColumnRenderer.isInstance('made up name', mockDatum)).toBe(false);
  });

  test('should return the value of event.category if event.category has a valid value', () => {
    const column = plainColumnRenderer.renderColumn({
      columnName: 'event.category',
      eventId: mockDatum._id,
      value: get('event.category', mockDatum),
      field: defaultHeaders.find(h => h.id === 'event.category')!,
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
      eventId: mockDatum._id,
      value: get('destination.ip', mockDatum),
      field: defaultHeaders.find(h => h.id === 'destination.ip')!,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('192.168.0.3');
  });

  test('should return the value of event.action if event has a valid value', () => {
    const column = plainColumnRenderer.renderColumn({
      columnName: 'event.action',
      eventId: mockDatum._id,
      value: get('event.action', mockDatum),
      field: defaultHeaders.find(h => h.id === 'event.action')!,
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
      columnName: 'timestamp',
      eventId: mockDatum._id,
      value: get('timestamp', mockDatum),
      field: defaultHeaders.find(h => h.id === '@timestamp')!,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(
      moment.tz(mockDatum.timestamp!, mockFramework.dateFormatTz!).format(mockFramework.dateFormat)
    );
  });

  test('should return an empty value if destination is empty', () => {
    delete mockDatum.destination;
    const emptyColumn = plainColumnRenderer.renderColumn({
      columnName: 'destination.ip',
      eventId: mockDatum._id,
      value: get('destination.ip', mockDatum),
      field: defaultHeaders.find(h => h.id === 'destination.ip')!,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{emptyColumn}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if destination ip is empty', () => {
    delete mockDatum.destination!.ip;
    const emptyColumn = plainColumnRenderer.renderColumn({
      columnName: 'destination.ip',
      eventId: mockDatum._id,
      value: get('destination.ip', mockDatum),
      field: defaultHeaders.find(h => h.id === 'destination.ip')!,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{emptyColumn}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if event severity is empty', () => {
    delete mockDatum.event!.severity;
    const emptyColumn = plainColumnRenderer.renderColumn({
      columnName: 'event.severity',
      eventId: mockDatum._id,
      value: get('event.severity', mockDatum),
      field: defaultHeaders.find(h => h.id === 'event.severity')!,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{emptyColumn}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
