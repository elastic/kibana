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

import { Ecs } from '../../../../graphql/types';
import { getAllFieldsInSchemaByMappedName, virtualEcsSchema } from '../../../../lib/ecs';
import { mockEcsData, mockFrameworks } from '../../../../mock';
import { TestProviders } from '../../../../mock/test_providers';
import { getEmptyValue } from '../../../empty_value';

import { plainColumnRenderer } from '.';

const allFieldsInSchemaByName = getAllFieldsInSchemaByMappedName(virtualEcsSchema);
const mockFramework = mockFrameworks.default_UTC;

describe('plain_column_renderer', () => {
  let mockDatum: Ecs;

  beforeEach(() => {
    mockDatum = cloneDeep(mockEcsData[0]);
  });

  test('renders correctly against snapshot', () => {
    const column = plainColumnRenderer.renderColumn({
      columnName: 'event.category',
      data: mockDatum,
      field: allFieldsInSchemaByName['event.category'],
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
      data: mockDatum,
      field: allFieldsInSchemaByName['event.category'],
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
      data: mockDatum,
      field: allFieldsInSchemaByName['destination.ip'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('192.168.0.3');
  });

  test('should return the value of event.id if event has a valid value', () => {
    const column = plainColumnRenderer.renderColumn({
      columnName: 'event.id',
      data: mockDatum,
      field: allFieldsInSchemaByName['event.id'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('1');
  });

  test('should return the value of geo.region_name if geo.region_name has a valid value', () => {
    const column = plainColumnRenderer.renderColumn({
      columnName: 'geo.region_name',
      data: mockDatum,
      field: allFieldsInSchemaByName['geo.region_name'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('xx');
  });

  test('should return the value of event.severity if severity has a valid value', () => {
    const column = plainColumnRenderer.renderColumn({
      columnName: 'event.severity',
      data: mockDatum,
      field: allFieldsInSchemaByName['event.severity'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('3');
  });

  test('should return the value of source.ip if source.ip has a valid value', () => {
    const column = plainColumnRenderer.renderColumn({
      columnName: 'source.ip',
      data: mockDatum,
      field: allFieldsInSchemaByName['source.ip'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('192.168.0.1');
  });

  test('should return the time formatted as per Kibana advanced settings if timestamp has a valid value', () => {
    const column = plainColumnRenderer.renderColumn({
      columnName: 'timestamp',
      data: mockDatum,
      field: allFieldsInSchemaByName.timestamp,
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

  test('should return the value of event.action if event.action has a valid value', () => {
    const column = plainColumnRenderer.renderColumn({
      columnName: 'event.action',
      data: mockDatum,
      field: allFieldsInSchemaByName['event.action'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('Action');
  });

  test('should return the of user.name if user.name has a valid value', () => {
    const column = plainColumnRenderer.renderColumn({
      columnName: 'user.name',
      data: mockDatum,
      field: allFieldsInSchemaByName['user.name'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{column}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual('john.dee');
  });

  test('should return an empty value if event.category is empty', () => {
    delete mockDatum!.event!.category;
    const emptyColumn = plainColumnRenderer.renderColumn({
      columnName: 'event.category',
      data: mockDatum,
      field: allFieldsInSchemaByName['event.category'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{emptyColumn}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if destination is empty', () => {
    delete mockDatum.destination;
    const emptyColumn = plainColumnRenderer.renderColumn({
      columnName: 'destination',
      data: mockDatum,
      field: allFieldsInSchemaByName.destination,
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
      data: mockDatum,
      field: allFieldsInSchemaByName['destination.ip'],
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
      data: mockDatum,
      field: allFieldsInSchemaByName['event.severity'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{emptyColumn}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if source is empty', () => {
    delete mockDatum.source;
    const emptyColumn = plainColumnRenderer.renderColumn({
      columnName: 'source',
      data: mockDatum,
      field: allFieldsInSchemaByName.source,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{emptyColumn}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if source.ip is empty', () => {
    delete mockDatum.source!.ip;
    const emptyColumn = plainColumnRenderer.renderColumn({
      columnName: 'source.ip',
      data: mockDatum,
      field: allFieldsInSchemaByName['source.ip'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{emptyColumn}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if event.action is empty', () => {
    delete mockDatum.event!.action;
    const emptyColumn = plainColumnRenderer.renderColumn({
      columnName: 'event.action',
      data: mockDatum,
      field: allFieldsInSchemaByName['event.action'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{emptyColumn}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value if user.name is empty', () => {
    delete mockDatum.user!.name;
    const emptyColumn = plainColumnRenderer.renderColumn({
      columnName: 'user.name',
      data: mockDatum,
      field: allFieldsInSchemaByName['user.name'],
    });
    const wrapper = mount(
      <TestProviders>
        <span>{emptyColumn}</span>
      </TestProviders>
    );
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
