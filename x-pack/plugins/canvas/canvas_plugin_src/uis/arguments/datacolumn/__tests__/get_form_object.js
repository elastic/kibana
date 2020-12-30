/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getFormObject } from '../get_form_object';

describe('getFormObject', () => {
  describe('valid input', () => {
    it('string', () => {
      expect(getFormObject('field')).to.be.eql({ fn: '', column: 'field' });
    });
    it('simple expression', () => {
      expect(getFormObject('mean(field)')).to.be.eql({ fn: 'mean', column: 'field' });
    });
  });
  describe('invalid input', () => {
    it('number', () => {
      expect(getFormObject)
        .withArgs('2')
        .to.throwException((e) => {
          expect(e.message).to.be('Cannot render scalar values or complex math expressions');
        });
    });
    it('complex expression', () => {
      expect(getFormObject)
        .withArgs('mean(field * 3)')
        .to.throwException((e) => {
          expect(e.message).to.be('Cannot render scalar values or complex math expressions');
        });
    });
  });
});
