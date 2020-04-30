/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSearchEsListItemMock } from '../mocks';
import { Type } from '../../../common/schemas';

import { deriveTypeFromItem } from './derive_type_from_es_type';

describe('derive_type_from_es_type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns the item ip if it exists', () => {
    const item = getSearchEsListItemMock();
    const derivedType = deriveTypeFromItem({ item });
    const expected: Type = 'ip';
    expect(derivedType).toEqual(expected);
  });

  test('it returns the item keyword if it exists', () => {
    const item = getSearchEsListItemMock();
    item.ip = undefined;
    item.keyword = 'some keyword';
    const derivedType = deriveTypeFromItem({ item });
    const expected: Type = 'keyword';
    expect(derivedType).toEqual(expected);
  });

  test('it throws an error with status code if neither one exists', () => {
    const item = getSearchEsListItemMock();
    item.ip = undefined;
    item.keyword = undefined;
    const expected = `Was expecting a valid type from the Elastic Search List Item such as ip or keyword but did not found one here ${JSON.stringify(
      item
    )}`;
    expect(() => deriveTypeFromItem({ item })).toThrowError(expected);
  });
});
