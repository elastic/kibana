/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addUpdatedField } from './use_filter_update';

describe('useFilterUpdate', () => {
  describe('addUpdatedField', () => {
    it('conditionally adds fields if they are new', () => {
      const testVal = {};
      addUpdatedField('a val', 'newField', 'a new val', testVal);
      expect(testVal).toEqual({
        newField: 'a new val',
      });
    });

    it('will add a field if the value is the same but not the default', () => {
      const testVal = {};
      addUpdatedField('a val', 'newField', 'a val', testVal);
      expect(testVal).toEqual({ newField: 'a val' });
    });

    it(`won't add a field if the current value is empty`, () => {
      const testVal = {};
      addUpdatedField('', 'newField', '', testVal);
      expect(testVal).toEqual({});
    });
  });
});
