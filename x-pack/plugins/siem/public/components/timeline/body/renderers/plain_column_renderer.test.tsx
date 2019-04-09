/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash/fp';
import moment from 'moment-timezone';
import * as React from 'react';

import { TimelineNonEcsData } from '../../../../graphql/types';
import { defaultHeaders, mockFrameworks, mockTimelineData, TestProviders } from '../../../../mock';
import { getEmptyValue } from '../../../empty_value';

import {
  deleteItemIdx,
  findItem,
  getValues,
  parseQueryValue,
  parseValue,
  plainColumnRenderer,
} from '.';

const mockFramework = mockFrameworks.default_UTC;

describe('plain_column_renderer', () => {
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
        field: defaultHeaders.find(h => h.id === 'event.category')!,
      });
      const wrapper = shallow(<span>{column}</span>);
      expect(toJson(wrapper)).toMatchSnapshot();
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
        eventId: _id,
        values: getValues('destination.ip', mockDatum),
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
        eventId: _id,
        values: getValues('event.action', mockDatum),
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
        columnName: '@timestamp',
        eventId: _id,
        values: getValues('@timestamp', mockDatum),
        field: defaultHeaders.find(h => h.id === '@timestamp')!,
      });
      const wrapper = mount(
        <TestProviders>
          <span>{column}</span>
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        moment
          .tz(getValues('@timestamp', mockDatum)![0], mockFramework.dateFormatTz!)
          .format(mockFramework.dateFormat)
      );
    });

    test('should return an empty value if destination ip is empty', () => {
      mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'destination.ip'));
      const emptyColumn = plainColumnRenderer.renderColumn({
        columnName: 'destination.ip',
        eventId: _id,
        values: getValues('destination.ip', mockDatum),
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
      mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'event.severity'));
      const emptyColumn = plainColumnRenderer.renderColumn({
        columnName: 'event.severity',
        eventId: _id,
        values: getValues('event.severity', mockDatum),
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

  describe('parseQueryValue', () => {
    test('parseQueryValue should return an empty string if value null', () => {
      expect(parseQueryValue(null)).toEqual('');
    });

    test('parseQueryValue should return an empty string if value undefined', () => {
      expect(parseQueryValue(undefined)).toEqual('');
    });

    test('parseQueryValue should return a string if value is an object', () => {
      expect(parseQueryValue({ hello: 'world' })).toEqual('{"hello":"world"}');
    });

    test('parseQueryValue should return a number if value is a number', () => {
      expect(parseQueryValue(33)).toEqual(33);
    });

    test('parseQueryValue should return a string if value is a string', () => {
      expect(parseQueryValue('I am a string')).toEqual('I am a string');
    });
  });

  describe('parseValue', () => {
    test('parseValue should return null if value null', () => {
      expect(parseValue(null)).toEqual(null);
    });

    test('parseValue should return undefined if value undefined', () => {
      expect(parseValue(undefined)).toEqual(undefined);
    });

    test('parseValue should return a string if value is an object', () => {
      expect(parseValue({ hello: 'world' })).toEqual('{"hello":"world"}');
    });

    test('parseValue should return a number if value is a number', () => {
      expect(parseValue(33)).toEqual(33);
    });

    test('parseValue should return a string if value is a string', () => {
      expect(parseValue('I am a string')).toEqual('I am a string');
    });
  });
});
