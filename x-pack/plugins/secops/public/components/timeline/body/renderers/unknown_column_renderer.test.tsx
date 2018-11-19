/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash';
import React from 'react';

import { EMPTY_VALUE } from '.';
import { mockECSData } from '../../../../pages/mock/mock_ecs';
import { ECS } from '../../ecs';
import { unknownColumnRenderer } from './unknown_column_renderer';

describe('unknown_column_renderer', () => {
  let mockDatum: ECS;
  beforeEach(() => {
    mockDatum = cloneDeep(mockECSData[0]);
  });

  test('should return isInstance true with a made up column name', () => {
    expect(unknownColumnRenderer.isInstance('a made up column name', mockDatum)).toBe(true);
  });

  test('should return an empty value with a made up column name that does not have a valid data value', () => {
    const emptyColumn = unknownColumnRenderer.renderColumn('a made up column name', mockDatum);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });

  test('should return an empty value with a column name that has valid id value', () => {
    const emptyColumn = unknownColumnRenderer.renderColumn('_id', mockDatum);
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(EMPTY_VALUE);
  });
});
