/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSearchEsListItemMock } from '../../../common/schemas/elastic_response/search_es_list_item_schema.mock';
import { Type } from '../../../common/schemas';

import { findSourceType } from './find_source_type';

describe('find_source_type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns the item ip if it exists', () => {
    const item = getSearchEsListItemMock();
    const derivedType = findSourceType(item);
    const expected: Type = 'ip';
    expect(derivedType).toEqual(expected);
  });

  test('it returns the item keyword if it exists', () => {
    const item = getSearchEsListItemMock();
    item.ip = undefined;
    item.keyword = 'some keyword';
    const derivedType = findSourceType(item);
    const expected: Type = 'keyword';
    expect(derivedType).toEqual(expected);
  });

  test('it returns a null if all the attached types are undefined', () => {
    const item = getSearchEsListItemMock();
    item.ip = undefined;
    item.keyword = undefined;
    expect(findSourceType(item)).toEqual(null);
  });
});
