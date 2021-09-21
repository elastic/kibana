/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseUserActionResponse, SUB_CASE_SAVED_OBJECT } from '../../../common';
import { SUB_CASE_REF_NAME } from '../../common';
import { extractAttributesWithoutSubCases } from './get';

describe('get', () => {
  describe('extractAttributesWithoutSubCases', () => {
    it('returns an empty array when given an empty array', () => {
      expect(
        extractAttributesWithoutSubCases({ ...getFindResponseFields(), saved_objects: [] })
      ).toEqual([]);
    });

    it('filters out saved objects with a sub case reference', () => {
      expect(
        extractAttributesWithoutSubCases({
          ...getFindResponseFields(),
          saved_objects: [
            {
              type: 'a',
              references: [{ name: SUB_CASE_REF_NAME, type: SUB_CASE_SAVED_OBJECT, id: '1' }],
              id: 'b',
              score: 0,
              attributes: {} as CaseUserActionResponse,
            },
          ],
        })
      ).toEqual([]);
    });

    it('filters out saved objects with a sub case reference with other references', () => {
      expect(
        extractAttributesWithoutSubCases({
          ...getFindResponseFields(),
          saved_objects: [
            {
              type: 'a',
              references: [
                { name: SUB_CASE_REF_NAME, type: SUB_CASE_SAVED_OBJECT, id: '1' },
                { name: 'a', type: 'b', id: '5' },
              ],
              id: 'b',
              score: 0,
              attributes: {} as CaseUserActionResponse,
            },
          ],
        })
      ).toEqual([]);
    });

    it('keeps saved objects that do not have a sub case reference', () => {
      expect(
        extractAttributesWithoutSubCases({
          ...getFindResponseFields(),
          saved_objects: [
            {
              type: 'a',
              references: [
                { name: SUB_CASE_REF_NAME, type: 'awesome', id: '1' },
                { name: 'a', type: 'b', id: '5' },
              ],
              id: 'b',
              score: 0,
              attributes: { field: '1' } as unknown as CaseUserActionResponse,
            },
          ],
        })
      ).toEqual([{ field: '1' }]);
    });

    it('filters multiple saved objects correctly', () => {
      expect(
        extractAttributesWithoutSubCases({
          ...getFindResponseFields(),
          saved_objects: [
            {
              type: 'a',
              references: [
                { name: SUB_CASE_REF_NAME, type: 'awesome', id: '1' },
                { name: 'a', type: 'b', id: '5' },
              ],
              id: 'b',
              score: 0,
              attributes: { field: '2' } as unknown as CaseUserActionResponse,
            },
            {
              type: 'a',
              references: [{ name: SUB_CASE_REF_NAME, type: SUB_CASE_SAVED_OBJECT, id: '1' }],
              id: 'b',
              score: 0,
              attributes: { field: '1' } as unknown as CaseUserActionResponse,
            },
          ],
        })
      ).toEqual([{ field: '2' }]);
    });
  });
});

const getFindResponseFields = () => ({ page: 1, per_page: 1, total: 0 });
