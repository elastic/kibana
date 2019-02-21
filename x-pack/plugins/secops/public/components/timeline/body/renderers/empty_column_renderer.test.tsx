/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { emptyColumnRenderer } from '.';
import { Ecs } from '../../../../graphql/types';
import { getAllFieldsInSchemaByMappedName, virtualEcsSchema } from '../../../../lib/ecs';
import { mockEcsData } from '../../../../mock';
import { getEmptyValue } from '../../../empty_value';

const allFieldsInSchemaByName = getAllFieldsInSchemaByMappedName(virtualEcsSchema);

describe('empty_column_renderer', () => {
  let mockDatum: Ecs;
  beforeEach(() => {
    mockDatum = cloneDeep(mockEcsData[0]);
  });

  test('should return isInstance true if source is empty', () => {
    delete mockDatum.source;
    expect(emptyColumnRenderer.isInstance('source', mockDatum)).toBe(true);
  });

  test('should return isInstance false if source is NOT empty', () => {
    expect(emptyColumnRenderer.isInstance('source', mockDatum)).toBe(false);
  });

  test('should return isInstance true if source.ip is empty', () => {
    delete mockDatum.source!.ip;
    expect(emptyColumnRenderer.isInstance('source.ip', mockDatum)).toBe(true);
  });

  test('should return isInstance false if source.ip is NOT empty', () => {
    expect(emptyColumnRenderer.isInstance('source.ip', mockDatum)).toBe(false);
  });

  test('should return isInstance true if it encounters a column it does not know about', () => {
    expect(emptyColumnRenderer.isInstance('made up name', mockDatum)).toBe(true);
  });

  test('should return an empty value', () => {
    delete mockDatum.source;
    const emptyColumn = emptyColumnRenderer.renderColumn(
      'source',
      mockDatum,
      allFieldsInSchemaByName.source
    );
    const wrapper = mount(<span>{emptyColumn}</span>);
    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
