/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFormObject } from './get_form_object';

describe('getFormObject', () => {
  describe('valid input', () => {
    it('string', () => {
      expect(getFormObject('field')).toEqual({ fn: '', column: 'field' });
    });
    it('simple expression', () => {
      expect(getFormObject('mean(field)')).toEqual({ fn: 'mean', column: 'field' });
    });
  });
  describe('invalid input', () => {
    it('number', () => {
      expect(() => {
        getFormObject('2');
      }).toThrow('Cannot render scalar values or complex math expressions');
    });
    it('complex expression', () => {
      expect(() => {
        getFormObject('mean(field * 3)');
      }).toThrow('Cannot render scalar values or complex math expressions');
    });
  });
});
