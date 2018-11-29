/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { cloneDeep, omit } from 'lodash/fp';
import React from 'react';

import { EMPTY_VALUE, emptyColumnRenderer } from '.';
import { mockECSData } from '../../../../mock/mock_ecs';
import { ECS } from '../../ecs';

describe('empty_column_renderer', () => {
  let mockDatum: ECS;
  beforeEach(() => {
    mockDatum = cloneDeep(mockECSData[0]);
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
