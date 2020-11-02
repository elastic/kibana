/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexField } from '../../../../common/search_strategy/index_fields';
import { getBrowserFields } from '.';
import { mockBrowserFields, mocksSource } from './mock';

describe('source/index.tsx', () => {
  describe('getBrowserFields', () => {
    test('it returns an empty object given an empty array', () => {
      const fields = getBrowserFields('title 1', []);
      expect(fields).toEqual({});
    });

    test('it returns the same input with the same title', () => {
      getBrowserFields('title 1', []);
      // Since it is memoized it will return the same output which is empty object given 'title 1' a second time
      const fields = getBrowserFields('title 1', mocksSource.indexFields as IndexField[]);
      expect(fields).toEqual({});
    });

    test('it transforms input into output as expected', () => {
      const fields = getBrowserFields('title 2', mocksSource.indexFields as IndexField[]);
      expect(fields).toEqual(mockBrowserFields);
    });
  });
});
