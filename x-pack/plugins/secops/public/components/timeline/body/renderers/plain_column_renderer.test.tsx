/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { cloneDeep, omit } from 'lodash/fp';
import React from 'react';

import moment = require('moment');
import { EMPTY_VALUE, plainColumnRenderer } from '.';
import { mockECSData } from '../../../../mock';
import { ECS } from '../../ecs';

describe('plain_column_renderer', () => {
  let mockDatum: ECS;
  beforeEach(() => {
    mockDatum = cloneDeep(mockECSData[0]);
  });

  test('should return isInstance false if source is empty', () => {
    const missingSource = omit('source', mockDatum);
    expect(plainColumnRenderer.isInstance('source', missingSource)).toBe(false);
  });

  test('should return isInstance true if source is NOT empty', () => {
    expect(plainColumnRenderer.isInstance('source', mockDatum)).toBe(true);
  });

  test('should return isInstance false if it encounters a column it does not know about', () => {
    expect(plainColumnRenderer.isInstance('made up name', mockDatum)).toBe(false);
  });

  test('should return the value of event.category if event.category has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('event.category', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('Access');
  });

  test('should return the value of destination.ip if destination.ip has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('destination.ip', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('192.168.0.3');
  });

  test('should return the value of event.id if event has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('event.id', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('1');
  });

  test('should return the value of geo.region_name if geo.region_name has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('geo.region_name', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('xx');
  });

  test('should return the value of event.severity if severity has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('event.severity', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('3');
  });

  test('should return the value of source.ip if source.ip has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('source.ip', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('192.168.0.1');
  });

  test('should return a formatted value of timestamp if timestamp has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('timestamp', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual(moment(mockDatum.timestamp).format());
  });

  test('should return the value of event.type if event.type has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('event.type', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('HTTP Request');
  });

  test('should return the of user.name if user.name has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('user.name', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('john.dee');
  });

  test('should return an empty value if event.category is empty', () => {
    const missingCategory = omit('event.category', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('event.category', missingCategory);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return an empty value if destination is empty', () => {
    const missingDestination = omit('destination', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('destination', missingDestination);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return an empty value if destination ip is empty', () => {
    const missingDestination = omit('destination.ip', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('destination.ip', missingDestination);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return an empty value if event severity is empty', () => {
    const missingSeverity = omit('event.severity', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('event.severity', missingSeverity);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return an empty value if source is empty', () => {
    const missingSource = omit('source', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('source', missingSource);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return an empty value if source.ip is empty', () => {
    const missingSource = omit('source.ip', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('source.ip', missingSource);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return an empty value if event.type is empty', () => {
    const missingType = omit('event.type', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('event.type', missingType);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return an empty value if user.name is empty', () => {
    const missingUser = omit('user.name', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('user.name', missingUser);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });
});
