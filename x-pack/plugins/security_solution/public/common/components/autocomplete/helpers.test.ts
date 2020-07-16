/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../common/mock/match_media';
import { getField } from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks.ts';

import {
  EXCEPTION_OPERATORS,
  isOperator,
  isNotOperator,
  existsOperator,
  doesNotExistOperator,
} from './operators';
import { getOperators, validateParams, getGenericComboBoxProps } from './helpers';

describe('helpers', () => {
  describe('#getOperators', () => {
    test('it returns "isOperator" if passed in field is "undefined"', () => {
      const operator = getOperators(undefined);

      expect(operator).toEqual([isOperator]);
    });

    test('it returns expected operators when field type is "boolean"', () => {
      const operator = getOperators(getField('ssl'));

      expect(operator).toEqual([isOperator, isNotOperator, existsOperator, doesNotExistOperator]);
    });

    test('it returns "isOperator" when field type is "nested"', () => {
      const operator = getOperators({
        name: 'nestedField',
        type: 'nested',
        esTypes: ['text'],
        count: 0,
        scripted: false,
        searchable: true,
        aggregatable: false,
        readFromDocValues: false,
        subType: { nested: { path: 'nestedField' } },
      });

      expect(operator).toEqual([isOperator]);
    });

    test('it returns all operator types when field type is not null, boolean, or nested', () => {
      const operator = getOperators(getField('machine.os.raw'));

      expect(operator).toEqual(EXCEPTION_OPERATORS);
    });
  });

  describe('#validateParams', () => {
    test('returns true if value is undefined', () => {
      const isValid = validateParams(undefined, 'date');

      expect(isValid).toBeTruthy();
    });

    test('returns true if value is empty string', () => {
      const isValid = validateParams('', 'date');

      expect(isValid).toBeTruthy();
    });

    test('returns true if type is "date" and value is valid', () => {
      const isValid = validateParams('1994-11-05T08:15:30-05:00', 'date');

      expect(isValid).toBeTruthy();
    });

    test('returns false if type is "date" and value is not valid', () => {
      const isValid = validateParams('1593478826', 'date');

      expect(isValid).toBeFalsy();
    });

    test('returns true if type is "ip" and value is valid', () => {
      const isValid = validateParams('126.45.211.34', 'ip');

      expect(isValid).toBeTruthy();
    });

    test('returns false if type is "ip" and value is not valid', () => {
      const isValid = validateParams('hellooo', 'ip');

      expect(isValid).toBeFalsy();
    });

    test('returns true if type is "number" and value is valid', () => {
      const isValid = validateParams('123', 'number');

      expect(isValid).toBeTruthy();
    });

    test('returns false if type is "number" and value is not valid', () => {
      const isValid = validateParams('not a number', 'number');

      expect(isValid).toBeFalsy();
    });
  });

  describe('#getGenericComboBoxProps', () => {
    test('it returns empty arrays if "options" is empty array', () => {
      const result = getGenericComboBoxProps<string>({
        options: [],
        selectedOptions: ['option1'],
        getLabel: (t: string) => t,
      });

      expect(result).toEqual({ comboOptions: [], labels: [], selectedComboOptions: [] });
    });

    test('it returns formatted props if "options" array is not empty', () => {
      const result = getGenericComboBoxProps<string>({
        options: ['option1', 'option2', 'option3'],
        selectedOptions: [],
        getLabel: (t: string) => t,
      });

      expect(result).toEqual({
        comboOptions: [
          {
            label: 'option1',
          },
          {
            label: 'option2',
          },
          {
            label: 'option3',
          },
        ],
        labels: ['option1', 'option2', 'option3'],
        selectedComboOptions: [],
      });
    });

    test('it does not return "selectedOptions" items that do not appear in "options"', () => {
      const result = getGenericComboBoxProps<string>({
        options: ['option1', 'option2', 'option3'],
        selectedOptions: ['option4'],
        getLabel: (t: string) => t,
      });

      expect(result).toEqual({
        comboOptions: [
          {
            label: 'option1',
          },
          {
            label: 'option2',
          },
          {
            label: 'option3',
          },
        ],
        labels: ['option1', 'option2', 'option3'],
        selectedComboOptions: [],
      });
    });

    test('it return "selectedOptions" items that do appear in "options"', () => {
      const result = getGenericComboBoxProps<string>({
        options: ['option1', 'option2', 'option3'],
        selectedOptions: ['option2'],
        getLabel: (t: string) => t,
      });

      expect(result).toEqual({
        comboOptions: [
          {
            label: 'option1',
          },
          {
            label: 'option2',
          },
          {
            label: 'option3',
          },
        ],
        labels: ['option1', 'option2', 'option3'],
        selectedComboOptions: [
          {
            label: 'option2',
          },
        ],
      });
    });
  });
});
