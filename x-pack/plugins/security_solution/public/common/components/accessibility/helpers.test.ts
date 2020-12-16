/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ariaIndexToArrayIndex, arrayIndexToAriaIndex } from './helpers';

describe('helpers', () => {
  describe('ariaIndexToArrayIndex', () => {
    it('returns the expected array index', () => {
      expect(ariaIndexToArrayIndex(1)).toEqual(0);
    });
  });

  describe('arrayIndexToAriaIndex', () => {
    it('returns the expected aria index', () => {
      expect(arrayIndexToAriaIndex(0)).toEqual(1);
    });
  });
});
