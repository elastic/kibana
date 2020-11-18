/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import '../../../common/mock/match_media';
import { getField } from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';

import * as i18n from './translations';
import {
  EXCEPTION_OPERATORS,
  isOperator,
  isNotOperator,
  existsOperator,
  doesNotExistOperator,
} from './operators';
import {
  getOperators,
  checkEmptyValue,
  paramIsValid,
  getGenericComboBoxProps,
  getFilteredBrowserFields,
  getSelectedFieldToBrowserField,
} from './helpers';
import { mockBrowserFields } from '../../containers/source/mock';
import { BrowserField, getAllBrowserFields } from '../../containers/source';

describe('helpers', () => {
  // @ts-ignore
  moment.suppressDeprecationWarnings = true;
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

  describe('#checkEmptyValue', () => {
    test('returns no errors if no field has been selected', () => {
      const isValid = checkEmptyValue('', undefined, true, false);

      expect(isValid).toBeUndefined();
    });

    test('returns error string if user has touched a required input and left empty', () => {
      const isValid = checkEmptyValue(undefined, getField('@timestamp'), true, true);

      expect(isValid).toEqual(i18n.FIELD_REQUIRED_ERR);
    });

    test('returns no errors if required input is empty but user has not yet touched it', () => {
      const isValid = checkEmptyValue(undefined, getField('@timestamp'), true, false);

      expect(isValid).toBeUndefined();
    });

    test('returns no errors if user has touched an input that is not required and left empty', () => {
      const isValid = checkEmptyValue(undefined, getField('@timestamp'), false, true);

      expect(isValid).toBeUndefined();
    });

    test('returns no errors if user has touched an input that is not required and left empty string', () => {
      const isValid = checkEmptyValue('', getField('@timestamp'), false, true);

      expect(isValid).toBeUndefined();
    });

    test('returns null if input value is not empty string or undefined', () => {
      const isValid = checkEmptyValue('hellooo', getField('@timestamp'), false, true);

      expect(isValid).toBeNull();
    });
  });

  describe('#paramIsValid', () => {
    test('returns no errors if no field has been selected', () => {
      const isValid = paramIsValid('', undefined, true, false);

      expect(isValid).toBeUndefined();
    });

    test('returns error string if user has touched a required input and left empty', () => {
      const isValid = paramIsValid(undefined, getField('@timestamp'), true, true);

      expect(isValid).toEqual(i18n.FIELD_REQUIRED_ERR);
    });

    test('returns no errors if required input is empty but user has not yet touched it', () => {
      const isValid = paramIsValid(undefined, getField('@timestamp'), true, false);

      expect(isValid).toBeUndefined();
    });

    test('returns no errors if user has touched an input that is not required and left empty', () => {
      const isValid = paramIsValid(undefined, getField('@timestamp'), false, true);

      expect(isValid).toBeUndefined();
    });

    test('returns no errors if user has touched an input that is not required and left empty string', () => {
      const isValid = paramIsValid('', getField('@timestamp'), false, true);

      expect(isValid).toBeUndefined();
    });

    test('returns no errors if field is of type date and value is valid', () => {
      const isValid = paramIsValid(
        '1994-11-05T08:15:30-05:00',
        getField('@timestamp'),
        false,
        true
      );

      expect(isValid).toBeUndefined();
    });

    test('returns errors if filed is of type date and value is not valid', () => {
      const isValid = paramIsValid('1593478826', getField('@timestamp'), false, true);

      expect(isValid).toEqual(i18n.DATE_ERR);
    });

    test('returns no errors if field is of type number and value is an integer', () => {
      const isValid = paramIsValid('4', getField('bytes'), true, true);

      expect(isValid).toBeUndefined();
    });

    test('returns no errors if field is of type number and value is a float', () => {
      const isValid = paramIsValid('4.3', getField('bytes'), true, true);

      expect(isValid).toBeUndefined();
    });

    test('returns no errors if field is of type number and value is a long', () => {
      const isValid = paramIsValid('-9223372036854775808', getField('bytes'), true, true);

      expect(isValid).toBeUndefined();
    });

    test('returns errors if field is of type number and value is "hello"', () => {
      const isValid = paramIsValid('hello', getField('bytes'), true, true);

      expect(isValid).toEqual(i18n.NUMBER_ERR);
    });

    test('returns errors if field is of type number and value is "123abc"', () => {
      const isValid = paramIsValid('123abc', getField('bytes'), true, true);

      expect(isValid).toEqual(i18n.NUMBER_ERR);
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

  describe('#getFilteredBrowserFields', () => {
    test('it filters browserfields by type', () => {
      const allAreOfTypeKeyword = (field: Partial<BrowserField>) =>
        field.esTypes != null ? field.esTypes.includes('keyword') : false;
      const result = getFilteredBrowserFields(mockBrowserFields, allAreOfTypeKeyword);
      const allAreKeyword = getAllBrowserFields(result).every(allAreOfTypeKeyword);

      expect(allAreKeyword).toBeTruthy();
    });

    test('it filters browserfields by which index they belong to', () => {
      const isInFilebeatIndex = (field: Partial<BrowserField>) =>
        field.indexes != null ? field.indexes.includes('filebeat') : false;
      const result = getFilteredBrowserFields(mockBrowserFields, isInFilebeatIndex);
      const allAreFromFilebeat = getAllBrowserFields(result).every(isInFilebeatIndex);

      expect(allAreFromFilebeat).toBeTruthy();
    });
  });

  describe('#getSelectedFieldToBrowserField', () => {
    test('it returns matching BrowserField', () => {
      const result = getSelectedFieldToBrowserField('auditd.data.a0', mockBrowserFields);
      const expected: Partial<BrowserField> = {
        aggregatable: true,
        category: 'auditd',
        description: null,
        esTypes: ['keyword'],
        example: null,
        format: '',
        indexes: ['auditbeat'],
        name: 'auditd.data.a0',
        searchable: true,
        type: 'string',
      };
      expect(result).toEqual(expected);
    });

    test('it returns undefined when no matching BrowserField found', () => {
      const result = getSelectedFieldToBrowserField('blah', mockBrowserFields);

      expect(result).toBeUndefined();
    });
  });
});
