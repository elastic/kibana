/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { omit } from 'lodash/fp';
import React from 'react';

import { EMPTY_VALUE, emptyColumnRenderer } from '.';
import { ECS } from '../../ecs';

describe('empty_column_renderer', () => {
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

  test('should return isInstance true if source is empty', () => {
    const missingSource = omit('source', mockDatum);
    expect(emptyColumnRenderer.isInstance('source', missingSource)).toBe(true);
  });

  test('should return isInstance false if source is NOT empty', () => {
    expect(emptyColumnRenderer.isInstance('source', mockDatum)).toBe(false);
  });

  test('should return isInstance false if it encounters a column it does not know about', () => {
    expect(emptyColumnRenderer.isInstance('made up name', mockDatum)).toBe(false);
  });

  test('should return an empty value', () => {
    const missingSource = omit('source', mockDatum);
    const emptyColumn = emptyColumnRenderer.renderColumn('source', missingSource);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });
});
