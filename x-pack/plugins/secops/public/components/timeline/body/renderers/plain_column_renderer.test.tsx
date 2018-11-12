/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { omit } from 'lodash/fp';
import React from 'react';

import { EMPTY_VALUE, plainColumnRenderer } from '.';
import { ECS } from '../../ecs';

describe('plain_column_renderer', () => {
  let mockDatum: ECS;
  beforeEach(() => {
    mockDatum = {
      _id: '1',
      timestamp: '2018-11-05T19:03:25.937Z',
      host: {
        hostname: 'apache',
        ip: '192.168.0.1',
      },
      event: {
        id: '1',
        category: 'Access',
        type: 'HTTP Request',
        module: 'nginx',
        severity: 3,
      },
      source: {
        ip: '192.168.0.1',
        port: 80,
      },
      destination: {
        ip: '192.168.0.3',
        port: 6343,
      },
      user: {
        id: '1',
        name: 'john.dee',
      },
      geo: {
        region_name: 'xx',
        country_iso_code: 'xx',
      },
    };
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

  test('should return a plain value of category if category has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('category', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('Access');
  });

  test('should return a plain value of destination if destination has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('destination', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('192.168.0.3');
  });

  test('should return a plain value of event if event has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('event', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('1');
  });

  test('should return a plain value of geo if geo has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('geo', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('xx');
  });

  test('should return a plain value of severity if severity has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('severity', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('3');
  });

  test('should return a plain value of source if source has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('source', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('192.168.0.1');
  });

  test('should return a plain value of timestamp if timestamp has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('timestamp', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('2018-11-05');
  });

  test('should return a plain value of type if type has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('type', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('HTTP Request');
  });

  test('should return a plain value of user if user has a valid value', () => {
    const column = plainColumnRenderer.renderColumn('user', mockDatum);
    const wrapper = mount(<span>{column}</span>);
    expect(wrapper.text()).toEqual('john.dee');
  });

  test('should return an empty value if category is empty', () => {
    const missingCategory = omit('event.category', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('category', missingCategory);
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
    const emptyColumn = plainColumnRenderer.renderColumn('destination', missingDestination);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return an empty value if event severity is empty', () => {
    const missingSeverity = omit('event.severity', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('severity', missingSeverity);
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
    const emptyColumn = plainColumnRenderer.renderColumn('source', missingSource);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return an empty value if type is empty', () => {
    const missingType = omit('event.type', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('type', missingType);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return an empty value if user name is empty', () => {
    const missingUser = omit('user.name', mockDatum);
    const emptyColumn = plainColumnRenderer.renderColumn('user', missingUser);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });
});
