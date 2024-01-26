/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../common/constants';
import { CASE_REF_NAME } from './constants';
import { findReferenceId, getCaseReferenceId } from './references';

describe('references', () => {
  describe('findReferenceId', () => {
    it('returns undefined when references is undefined', () => {
      expect(findReferenceId('', '', undefined)).toBeUndefined();
    });

    it('returns undefined when the references array is empty', () => {
      expect(findReferenceId('', '', [])).toBeUndefined();
    });

    it('returns undefined when the name does not match', () => {
      expect(findReferenceId('abc', '123', [{ name: 'hi', type: '123', id: '1' }])).toBeUndefined();
    });

    it('returns undefined when the type does not match', () => {
      expect(findReferenceId('abc', '123', [{ name: 'abc', type: 'hi', id: '1' }])).toBeUndefined();
    });

    it('returns the id when a reference matches', () => {
      expect(findReferenceId('abc', '123', [{ name: 'abc', type: '123', id: '1' }])).toEqual('1');
    });
  });

  describe('getCaseReferenceId', () => {
    it('returns undefined when the references array is empty', () => {
      expect(getCaseReferenceId([])).toBeUndefined();
    });

    it('returns undefined when the name does not match', () => {
      expect(
        getCaseReferenceId([{ name: 'hi', type: CASE_SAVED_OBJECT, id: '1' }])
      ).toBeUndefined();
    });

    it('returns undefined when the type does not match', () => {
      expect(getCaseReferenceId([{ name: CASE_REF_NAME, type: 'abc', id: '1' }])).toBeUndefined();
    });

    it('returns the id when a reference matches', () => {
      expect(
        getCaseReferenceId([{ name: CASE_REF_NAME, type: CASE_SAVED_OBJECT, id: '1' }])
      ).toEqual('1');
    });
  });
});
