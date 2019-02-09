/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash';
import React from 'react';

import { Ecs } from '../../../../graphql/types';
import { getAllFieldsInSchemaByMappedName, virtualEcsSchema } from '../../../../lib/ecs';
import { mockEcsData } from '../../../../mock';
import { getEmptyValue } from '../../../empty_value';
import { unknownColumnRenderer } from './unknown_column_renderer';

const allFieldsInSchemaByName = getAllFieldsInSchemaByMappedName(virtualEcsSchema);

describe('unknown_column_renderer', () => {
  let mockDatum: Ecs;
  beforeEach(() => {
    mockDatum = cloneDeep(mockEcsData[0]);
  });

  test('should return isInstance true with a made up column name', () => {
    expect(unknownColumnRenderer.isInstance('a made up column name', mockDatum)).toBe(true);
  });

  test('should return an empty value with a made up column name that does not have a valid data value', () => {
    const emptyColumn = unknownColumnRenderer.renderColumn(
      'a made up column name',
      mockDatum,
      allFieldsInSchemaByName['a made up column name']
    );
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value with a column name that has valid id value', () => {
    const emptyColumn = unknownColumnRenderer.renderColumn(
      '_id',
      mockDatum,
      allFieldsInSchemaByName._id
    );
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
