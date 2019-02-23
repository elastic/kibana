/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep, get } from 'lodash';
import React from 'react';

import { Ecs } from '../../../../graphql/types';
import { defaultHeaders, mockEcsData } from '../../../../mock';
import { getEmptyValue } from '../../../empty_value';

import { unknownColumnRenderer } from './unknown_column_renderer';

describe('unknown_column_renderer', () => {
  let mockDatum: Ecs;
  beforeEach(() => {
    mockDatum = cloneDeep(mockEcsData[0]);
  });

  test('renders correctly against snapshot', () => {
    const emptyColumn = unknownColumnRenderer.renderColumn({
      columnName: '_id',
      eventId: mockDatum._id,
      value: get('_id', mockDatum),
      field: defaultHeaders.find(h => h.id === '_id')!,
    });
    const wrapper = shallow(<span>{emptyColumn}</span>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('should return isInstance true with a made up column name', () => {
    expect(unknownColumnRenderer.isInstance('a made up column name', mockDatum)).toBe(true);
  });

  test('should return an empty value with a made up column name that does not have a valid data value', () => {
    const emptyColumn = unknownColumnRenderer.renderColumn({
      columnName: 'a made up column name',
      eventId: mockDatum._id,
      value: get('a made up column name', mockDatum),
      field: defaultHeaders.find(h => h.id === 'a made up column name')!,
    });
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(getEmptyValue());
  });

  test('should return an empty value with a column name that has valid id value', () => {
    const emptyColumn = unknownColumnRenderer.renderColumn({
      columnName: '_id',
      eventId: mockDatum._id,
      value: get('_id', mockDatum),
      field: defaultHeaders.find(h => h.id === '_id')!,
    });
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
