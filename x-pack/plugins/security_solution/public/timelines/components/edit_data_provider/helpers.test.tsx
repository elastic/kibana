/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataProviderType } from '@kbn/timelines-plugin/common';

import { mockBrowserFields } from '../../../common/containers/source/mock';
import {
  EXISTS_OPERATOR,
  IS_OPERATOR,
  IS_ONE_OF_OPERATOR,
} from '../timeline/data_providers/data_provider';

import {
  getCategorizedFieldNames,
  getExcludedFromSelection,
  getFieldNames,
  getQueryOperatorFromSelection,
  sanatizeValue,
  selectionsAreValid,
} from './helpers';

import * as i18n from './translations';

describe('helpers', () => {
  describe('getFieldNames', () => {
    test('it should return the expected field names in a category', () => {
      expect(getFieldNames(mockBrowserFields.auditd)).toEqual([
        'auditd.data.a0',
        'auditd.data.a1',
        'auditd.data.a2',
      ]);
    });
  });

  describe('getCategorizedFieldNames', () => {
    test('it should return the expected field names grouped by category', () => {
      expect(getCategorizedFieldNames(mockBrowserFields)).toEqual([
        {
          label: 'agent',
          options: [
            { label: 'agent.ephemeral_id' },
            { label: 'agent.hostname' },
            { label: 'agent.id' },
            { label: 'agent.name' },
          ],
        },
        {
          label: 'auditd',
          options: [
            { label: 'auditd.data.a0' },
            { label: 'auditd.data.a1' },
            { label: 'auditd.data.a2' },
          ],
        },
        {
          label: 'base',
          options: [{ label: '@timestamp' }, { label: '_id' }, { label: 'message' }],
        },
        {
          label: 'client',
          options: [
            { label: 'client.address' },
            { label: 'client.bytes' },
            { label: 'client.domain' },
            { label: 'client.geo.country_iso_code' },
          ],
        },
        {
          label: 'cloud',
          options: [{ label: 'cloud.account.id' }, { label: 'cloud.availability_zone' }],
        },
        {
          label: 'container',
          options: [
            { label: 'container.id' },
            { label: 'container.image.name' },
            { label: 'container.image.tag' },
          ],
        },
        {
          label: 'destination',
          options: [
            { label: 'destination.address' },
            { label: 'destination.bytes' },
            { label: 'destination.domain' },
            { label: 'destination.ip' },
            { label: 'destination.port' },
          ],
        },
        {
          label: 'event',
          options: [
            { label: 'event.end' },
            { label: 'event.action' },
            { label: 'event.category' },
            { label: 'event.severity' },
          ],
        },
        {
          label: 'host',
          options: [{ label: 'host.name' }],
        },
        {
          label: 'nestedField',
          options: [
            {
              label: 'nestedField.firstAttributes',
            },
            {
              label: 'nestedField.secondAttributes',
            },
            {
              label: 'nestedField.thirdAttributes',
            },
          ],
        },
        { label: 'source', options: [{ label: 'source.ip' }, { label: 'source.port' }] },
        {
          label: 'user',
          options: [{ label: 'user.name' }],
        },
      ]);
    });
  });

  describe('selectionsAreValid', () => {
    test('it should return true when the selected field and operator are valid', () => {
      expect(
        selectionsAreValid({
          browserFields: mockBrowserFields,
          selectedField: [
            {
              label: 'destination.bytes',
            },
          ],
          selectedOperator: [
            {
              label: 'is',
            },
          ],
          type: DataProviderType.default,
        })
      ).toBe(true);
    });

    test('it should return false when the selected field is empty', () => {
      expect(
        selectionsAreValid({
          browserFields: mockBrowserFields,
          selectedField: [
            {
              label: '',
            },
          ],
          selectedOperator: [
            {
              label: 'is',
            },
          ],
          type: DataProviderType.default,
        })
      ).toBe(false);
    });

    test('it should return false when the selected field is unknown', () => {
      expect(
        selectionsAreValid({
          browserFields: mockBrowserFields,
          selectedField: [
            {
              label: 'invalid-field',
            },
          ],
          selectedOperator: [
            {
              label: 'is one of',
            },
          ],
          type: DataProviderType.default,
        })
      ).toBe(false);
    });

    test('it should return false when the selected operator is empty', () => {
      expect(
        selectionsAreValid({
          browserFields: mockBrowserFields,
          selectedField: [
            {
              label: 'destination.bytes',
            },
          ],
          selectedOperator: [
            {
              label: '',
            },
          ],
          type: DataProviderType.default,
        })
      ).toBe(false);
    });

    test('it should return false when the selected operator is unknown', () => {
      expect(
        selectionsAreValid({
          browserFields: mockBrowserFields,
          selectedField: [
            {
              label: 'destination.bytes',
            },
          ],
          selectedOperator: [
            {
              label: 'invalid-operator',
            },
          ],
          type: DataProviderType.default,
        })
      ).toBe(false);
    });

    test('it should return false when the selected operator is "is one of", and the DataProviderType is template', () => {
      expect(
        selectionsAreValid({
          browserFields: mockBrowserFields,
          selectedField: [
            {
              label: 'destination.bytes',
            },
          ],
          selectedOperator: [
            {
              label: 'is one of',
            },
          ],
          type: DataProviderType.template,
        })
      ).toBe(false);
    });

    test('it should return false when the selected operator is "is not one of", and the DataProviderType is template', () => {
      expect(
        selectionsAreValid({
          browserFields: mockBrowserFields,
          selectedField: [
            {
              label: 'destination.bytes',
            },
          ],
          selectedOperator: [
            {
              label: 'is not one of',
            },
          ],
          type: DataProviderType.template,
        })
      ).toBe(false);
    });
  });

  describe('getQueryOperatorFromSelection', () => {
    const validSelections = [
      {
        operator: i18n.IS,
        expected: IS_OPERATOR,
      },
      {
        operator: i18n.IS_NOT,
        expected: IS_OPERATOR,
      },
      {
        operator: i18n.IS_ONE_OF,
        expected: IS_ONE_OF_OPERATOR,
      },
      {
        operator: i18n.IS_NOT_ONE_OF,
        expected: IS_ONE_OF_OPERATOR,
      },
      {
        operator: i18n.EXISTS,
        expected: EXISTS_OPERATOR,
      },
      {
        operator: i18n.DOES_NOT_EXIST,
        expected: EXISTS_OPERATOR,
      },
    ];

    validSelections.forEach(({ operator, expected }) => {
      test(`it should use the expected operator given "${operator}", a valid selection`, () => {
        expect(
          getQueryOperatorFromSelection([
            {
              label: operator,
            },
          ])
        ).toEqual(expected);
      });
    });

    test('it should default to the "is" operator given an empty selection', () => {
      expect(
        getQueryOperatorFromSelection([
          {
            label: '',
          },
        ])
      ).toEqual(IS_OPERATOR);
    });

    test('it should default to the "is" operator given an invalid selection', () => {
      expect(
        getQueryOperatorFromSelection([
          {
            label: 'invalid',
          },
        ])
      ).toEqual(IS_OPERATOR);
    });
  });

  describe('getExcludedFromSelection', () => {
    test('it returns false when the selected operator is empty', () => {
      expect(
        getExcludedFromSelection([
          {
            label: '',
          },
        ])
      ).toBe(false);
    });

    test('it returns false when the "is" operator is selected', () => {
      expect(
        getExcludedFromSelection([
          {
            label: i18n.IS,
          },
        ])
      ).toBe(false);
    });
    test('it returns false when the "is one of" operator is selected', () => {
      expect(
        getExcludedFromSelection([
          {
            label: i18n.IS_ONE_OF,
          },
        ])
      ).toBe(false);
    });

    test('it returns false when the "exists" operator is selected', () => {
      expect(
        getExcludedFromSelection([
          {
            label: i18n.EXISTS,
          },
        ])
      ).toBe(false);
    });

    test('it returns false when an unknown selection is made', () => {
      expect(
        getExcludedFromSelection([
          {
            label: 'an unknown selection',
          },
        ])
      ).toBe(false);
    });

    test('it returns true when "is not" is selected', () => {
      expect(
        getExcludedFromSelection([
          {
            label: i18n.IS_NOT,
          },
        ])
      ).toBe(true);
    });

    test('it returns true when "is not one of" is selected', () => {
      expect(
        getExcludedFromSelection([
          {
            label: i18n.IS_NOT_ONE_OF,
          },
        ])
      ).toBe(true);
    });

    test('it returns true when "does not exist" is selected', () => {
      expect(
        getExcludedFromSelection([
          {
            label: i18n.DOES_NOT_EXIST,
          },
        ])
      ).toBe(true);
    });
  });

  describe('sanatizeValue', () => {
    it("returns a provided value if it's a string or number as a string", () => {
      expect(sanatizeValue('a string')).toBe('a string');
      expect(sanatizeValue(1)).toBe('1');
    });

    it('returns the string interpretation of the first value of an array', () => {
      expect(sanatizeValue(['a string', 'another value'])).toBe('a string');
      expect(sanatizeValue([1, 'another value'])).toBe('1');
      expect(sanatizeValue([])).toBe('');
      expect(sanatizeValue([null])).toBe('null');
      expect(sanatizeValue([undefined])).toBe('undefined');
    });
  });
});
