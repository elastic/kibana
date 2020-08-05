/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { copyPersistentState } from './util';

describe('reducers/util', () => {
  describe('copyPersistentState', () => {
    it('should ignore state preceded by double underscores', async () => {
      const copy = copyPersistentState({
        foo: 'bar',
        nested: {
          bar: 'foo',
          __bar: 'foo__',
        },
      });

      expect(copy).toEqual({
        foo: 'bar',
        nested: {
          bar: 'foo',
        },
      });
    });

    it('should copy null value correctly', async () => {
      const copy = copyPersistentState({
        foo: 'bar',
        nested: {
          nullval: null,
          bar: 'foo',
          __bar: 'foo__',
        },
      });

      expect(copy).toEqual({
        foo: 'bar',
        nested: {
          nullval: null,
          bar: 'foo',
        },
      });
    });
  });
});
