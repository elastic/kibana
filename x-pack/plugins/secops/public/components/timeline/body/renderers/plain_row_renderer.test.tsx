/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { plainRowRenderer } from '.';
import { ECS } from '../../ecs';

describe('plain_row_renderer', () => {
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

  test('should always return isInstance true', () => {
    expect(plainRowRenderer.isInstance(mockDatum)).toBe(true);
  });

  test('should render a plain row', () => {
    const children = plainRowRenderer.renderRow(mockDatum, <span>some children</span>);
    const wrapper = mount(<span>{children}</span>);
    expect(wrapper.text()).toEqual('some children');
  });
});
