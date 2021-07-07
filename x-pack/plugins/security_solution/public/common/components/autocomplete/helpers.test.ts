/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import '../../../common/mock/match_media';
import { getField } from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { IFieldType } from '../../../../../../../src/plugins/data/common';

import * as i18n from './translations';
import {
  EXCEPTION_OPERATORS,
  isOperator,
  isNotOperator,
  existsOperator,
  doesNotExistOperator,
} from '@kbn/securitysolution-list-utils';
import {
  getOperators,
  checkEmptyValue,
  paramIsValid,
  getGenericComboBoxProps,
  typeMatch,
  filterFieldToList,
} from './helpers';
import { getListResponseMock } from '../../../../../lists/common/schemas/response/list_schema.mock';
import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';

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

  describe('#typeMatch', () => {
    test('ip -> ip is true', () => {
      expect(typeMatch('ip', 'ip')).toEqual(true);
    });

    test('keyword -> keyword is true', () => {
      expect(typeMatch('keyword', 'keyword')).toEqual(true);
    });

    test('text -> text is true', () => {
      expect(typeMatch('text', 'text')).toEqual(true);
    });

    test('ip_range -> ip is true', () => {
      expect(typeMatch('ip_range', 'ip')).toEqual(true);
    });

    test('date_range -> date is true', () => {
      expect(typeMatch('date_range', 'date')).toEqual(true);
    });

    test('double_range -> double is true', () => {
      expect(typeMatch('double_range', 'double')).toEqual(true);
    });

    test('float_range -> float is true', () => {
      expect(typeMatch('float_range', 'float')).toEqual(true);
    });

    test('integer_range -> integer is true', () => {
      expect(typeMatch('integer_range', 'integer')).toEqual(true);
    });

    test('long_range -> long is true', () => {
      expect(typeMatch('long_range', 'long')).toEqual(true);
    });

    test('ip -> date is false', () => {
      expect(typeMatch('ip', 'date')).toEqual(false);
    });

    test('long -> float is false', () => {
      expect(typeMatch('long', 'float')).toEqual(false);
    });

    test('integer -> long is false', () => {
      expect(typeMatch('integer', 'long')).toEqual(false);
    });
  });

  describe('#filterFieldToList', () => {
    test('it returns empty array if given a undefined for field', () => {
      const filter = filterFieldToList([], undefined);
      expect(filter).toEqual([]);
    });

    test('it returns empty array if filed does not contain esTypes', () => {
      const field: IFieldType = { name: 'some-name', type: 'some-type' };
      const filter = filterFieldToList([], field);
      expect(filter).toEqual([]);
    });

    test('it returns single filtered list of ip_range -> ip', () => {
      const field: IFieldType = { name: 'some-name', type: 'ip', esTypes: ['ip'] };
      const listItem: ListSchema = { ...getListResponseMock(), type: 'ip_range' };
      const filter = filterFieldToList([listItem], field);
      const expected: ListSchema[] = [listItem];
      expect(filter).toEqual(expected);
    });

    test('it returns single filtered list of ip -> ip', () => {
      const field: IFieldType = { name: 'some-name', type: 'ip', esTypes: ['ip'] };
      const listItem: ListSchema = { ...getListResponseMock(), type: 'ip' };
      const filter = filterFieldToList([listItem], field);
      const expected: ListSchema[] = [listItem];
      expect(filter).toEqual(expected);
    });

    test('it returns single filtered list of keyword -> keyword', () => {
      const field: IFieldType = { name: 'some-name', type: 'keyword', esTypes: ['keyword'] };
      const listItem: ListSchema = { ...getListResponseMock(), type: 'keyword' };
      const filter = filterFieldToList([listItem], field);
      const expected: ListSchema[] = [listItem];
      expect(filter).toEqual(expected);
    });

    test('it returns single filtered list of text -> text', () => {
      const field: IFieldType = { name: 'some-name', type: 'text', esTypes: ['text'] };
      const listItem: ListSchema = { ...getListResponseMock(), type: 'text' };
      const filter = filterFieldToList([listItem], field);
      const expected: ListSchema[] = [listItem];
      expect(filter).toEqual(expected);
    });

    test('it returns 2 filtered lists of ip_range -> ip', () => {
      const field: IFieldType = { name: 'some-name', type: 'ip', esTypes: ['ip'] };
      const listItem1: ListSchema = { ...getListResponseMock(), type: 'ip_range' };
      const listItem2: ListSchema = { ...getListResponseMock(), type: 'ip_range' };
      const filter = filterFieldToList([listItem1, listItem2], field);
      const expected: ListSchema[] = [listItem1, listItem2];
      expect(filter).toEqual(expected);
    });

    test('it returns 1 filtered lists of ip_range -> ip if the 2nd is not compatible type', () => {
      const field: IFieldType = { name: 'some-name', type: 'ip', esTypes: ['ip'] };
      const listItem1: ListSchema = { ...getListResponseMock(), type: 'ip_range' };
      const listItem2: ListSchema = { ...getListResponseMock(), type: 'text' };
      const filter = filterFieldToList([listItem1, listItem2], field);
      const expected: ListSchema[] = [listItem1];
      expect(filter).toEqual(expected);
    });
  });
});
