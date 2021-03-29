/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fields,
  getField,
} from '../../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { getEntryNestedMock } from '../../../../../../lists/common/schemas/types/entry_nested.mock';
import { getEntryMatchMock } from '../../../../../../lists/common/schemas/types/entry_match.mock';
import { getEntryMatchAnyMock } from '../../../../../../lists/common/schemas/types/entry_match_any.mock';
import { getEntryExistsMock } from '../../../../../../lists/common/schemas/types/entry_exists.mock';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { isOneOfOperator, isOperator } from '../../autocomplete/operators';
import { BuilderEntry, ExceptionsBuilderExceptionItem, FormattedBuilderEntry } from '../types';
import { IFieldType, IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { EntryNested, OperatorTypeEnum, OperatorEnum } from '../../../../shared_imports';

import {
  filterIndexPatterns,
  getFormattedBuilderEntries,
  getFormattedBuilderEntry,
  getUpdatedEntriesOnDelete,
  isEntryNested,
  getCorrespondingKeywordField,
} from './helpers';
import { ENTRIES_WITH_IDS } from '../../../../../../lists/common/constants.mock';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('123'),
}));

const getEntryNestedWithIdMock = () => ({
  id: '123',
  ...getEntryNestedMock(),
});

const getEntryExistsWithIdMock = () => ({
  id: '123',
  ...getEntryExistsMock(),
});

const getEntryMatchWithIdMock = () => ({
  id: '123',
  ...getEntryMatchMock(),
});

const getEntryMatchAnyWithIdMock = () => ({
  id: '123',
  ...getEntryMatchAnyMock(),
});

const getMockIndexPattern = (): IIndexPattern => ({
  id: '1234',
  title: 'logstash-*',
  fields,
});

const mockEndpointFields = [
  {
    name: 'file.path.caseless',
    type: 'string',
    esTypes: ['keyword'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
  },
  {
    name: 'file.Ext.code_signature.status',
    type: 'string',
    esTypes: ['text'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
    subType: { nested: { path: 'file.Ext.code_signature' } },
  },
];

export const getEndpointField = (name: string) =>
  mockEndpointFields.find((field) => field.name === name) as IFieldType;

describe('Exception builder helpers', () => {
  describe('#filterIndexPatterns', () => {
    test('it returns index patterns without filtering if list type is "detection"', () => {
      const mockIndexPatterns = getMockIndexPattern();
      const output = filterIndexPatterns(mockIndexPatterns, 'detection');

      expect(output).toEqual(mockIndexPatterns);
    });

    test('it returns filtered index patterns if list type is "endpoint"', () => {
      const mockIndexPatterns = {
        ...getMockIndexPattern(),
        fields: [...fields, ...mockEndpointFields],
      };
      const output = filterIndexPatterns(mockIndexPatterns, 'endpoint');

      expect(output).toEqual({ ...getMockIndexPattern(), fields: [...mockEndpointFields] });
    });
  });
  describe('#getCorrespondingKeywordField', () => {
    test('it returns matching keyword field if "selectedFieldIsTextType" is true and keyword field exists', () => {
      const output = getCorrespondingKeywordField({
        fields,
        selectedField: 'machine.os.raw.text',
      });

      expect(output).toEqual(getField('machine.os.raw'));
    });

    test('it returns undefined if "selectedFieldIsTextType" is false', () => {
      const output = getCorrespondingKeywordField({
        fields,
        selectedField: 'machine.os.raw',
      });

      expect(output).toEqual(undefined);
    });

    test('it returns undefined if "selectedField" is empty string', () => {
      const output = getCorrespondingKeywordField({
        fields,
        selectedField: '',
      });

      expect(output).toEqual(undefined);
    });

    test('it returns undefined if "selectedField" is undefined', () => {
      const output = getCorrespondingKeywordField({
        fields,
        selectedField: undefined,
      });

      expect(output).toEqual(undefined);
    });
  });

  describe('#getFormattedBuilderEntry', () => {
    test('it returns entry with a value for "correspondingKeywordField" when "item.field" is of type "text" and matching keyword field exists', () => {
      const payloadIndexPattern: IIndexPattern = {
        ...getMockIndexPattern(),
        fields: [
          ...fields,
          {
            name: 'machine.os.raw.text',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: false,
            aggregatable: false,
            readFromDocValues: true,
          },
        ],
      };
      const payloadItem: BuilderEntry = {
        ...getEntryMatchWithIdMock(),
        field: 'machine.os.raw.text',
        value: 'some os',
      };
      const output = getFormattedBuilderEntry(
        payloadIndexPattern,
        payloadItem,
        0,
        undefined,
        undefined
      );
      const expected: FormattedBuilderEntry = {
        id: '123',
        entryIndex: 0,
        field: {
          name: 'machine.os.raw.text',
          type: 'string',
          esTypes: ['text'],
          count: 0,
          scripted: false,
          searchable: false,
          aggregatable: false,
          readFromDocValues: true,
        },
        nested: undefined,
        operator: isOperator,
        parent: undefined,
        value: 'some os',
        correspondingKeywordField: getField('machine.os.raw'),
      };
      expect(output).toEqual(expected);
    });

    test('it returns "FormattedBuilderEntry" with value "nested" of "child" when "parent" and "parentIndex" are defined', () => {
      const payloadIndexPattern: IIndexPattern = getMockIndexPattern();
      const payloadItem: BuilderEntry = { ...getEntryMatchWithIdMock(), field: 'child' };
      const payloadParent: EntryNested = {
        ...getEntryNestedWithIdMock(),
        field: 'nestedField',
        entries: [{ ...getEntryMatchWithIdMock(), field: 'child' }],
      };
      const output = getFormattedBuilderEntry(
        payloadIndexPattern,
        payloadItem,
        0,
        payloadParent,
        1
      );
      const expected: FormattedBuilderEntry = {
        id: '123',
        entryIndex: 0,
        field: {
          aggregatable: false,
          count: 0,
          esTypes: ['text'],
          name: 'child',
          readFromDocValues: false,
          scripted: false,
          searchable: true,
          subType: {
            nested: {
              path: 'nestedField',
            },
          },
          type: 'string',
        },
        nested: 'child',
        operator: isOperator,
        parent: {
          parent: {
            id: '123',
            entries: [{ ...payloadItem }],
            field: 'nestedField',
            type: OperatorTypeEnum.NESTED,
          },
          parentIndex: 1,
        },
        value: 'some host name',
        correspondingKeywordField: undefined,
      };
      expect(output).toEqual(expected);
    });

    test('it returns non nested "FormattedBuilderEntry" when "parent" and "parentIndex" are not defined', () => {
      const payloadIndexPattern: IIndexPattern = getMockIndexPattern();
      const payloadItem: BuilderEntry = {
        ...getEntryMatchWithIdMock(),
        field: 'ip',
        value: 'some ip',
      };
      const output = getFormattedBuilderEntry(
        payloadIndexPattern,
        payloadItem,
        0,
        undefined,
        undefined
      );
      const expected: FormattedBuilderEntry = {
        id: '123',
        entryIndex: 0,
        field: {
          aggregatable: true,
          count: 0,
          esTypes: ['ip'],
          name: 'ip',
          readFromDocValues: true,
          scripted: false,
          searchable: true,
          type: 'ip',
        },
        nested: undefined,
        operator: isOperator,
        parent: undefined,
        value: 'some ip',
        correspondingKeywordField: undefined,
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#isEntryNested', () => {
    test('it returns "false" if payload is not of type EntryNested', () => {
      const payload: BuilderEntry = getEntryMatchWithIdMock();
      const output = isEntryNested(payload);
      const expected = false;
      expect(output).toEqual(expected);
    });

    test('it returns "true if payload is of type EntryNested', () => {
      const payload: EntryNested = getEntryNestedWithIdMock();
      const output = isEntryNested(payload);
      const expected = true;
      expect(output).toEqual(expected);
    });
  });

  describe('#getFormattedBuilderEntries', () => {
    test('it returns formatted entry with field undefined if it unable to find a matching index pattern field', () => {
      const payloadIndexPattern: IIndexPattern = getMockIndexPattern();
      const payloadItems: BuilderEntry[] = [getEntryMatchWithIdMock()];
      const output = getFormattedBuilderEntries(payloadIndexPattern, payloadItems);
      const expected: FormattedBuilderEntry[] = [
        {
          id: '123',
          entryIndex: 0,
          field: undefined,
          nested: undefined,
          operator: isOperator,
          parent: undefined,
          value: 'some host name',
          correspondingKeywordField: undefined,
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns formatted entries when no nested entries exist', () => {
      const payloadIndexPattern: IIndexPattern = getMockIndexPattern();
      const payloadItems: BuilderEntry[] = [
        { ...getEntryMatchWithIdMock(), field: 'ip', value: 'some ip' },
        { ...getEntryMatchAnyWithIdMock(), field: 'extension', value: ['some extension'] },
      ];
      const output = getFormattedBuilderEntries(payloadIndexPattern, payloadItems);
      const expected: FormattedBuilderEntry[] = [
        {
          id: '123',
          entryIndex: 0,
          field: {
            aggregatable: true,
            count: 0,
            esTypes: ['ip'],
            name: 'ip',
            readFromDocValues: true,
            scripted: false,
            searchable: true,
            type: 'ip',
          },
          nested: undefined,
          operator: isOperator,
          parent: undefined,
          value: 'some ip',
          correspondingKeywordField: undefined,
        },
        {
          id: '123',
          entryIndex: 1,
          field: {
            aggregatable: true,
            count: 0,
            esTypes: ['keyword'],
            name: 'extension',
            readFromDocValues: true,
            scripted: false,
            searchable: true,
            type: 'string',
          },
          nested: undefined,
          operator: isOneOfOperator,
          parent: undefined,
          value: ['some extension'],
          correspondingKeywordField: undefined,
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns formatted entries when nested entries exist', () => {
      const payloadIndexPattern: IIndexPattern = getMockIndexPattern();
      const payloadParent: EntryNested = {
        ...getEntryNestedWithIdMock(),
        field: 'nestedField',
        entries: [{ ...getEntryMatchWithIdMock(), field: 'child' }],
      };
      const payloadItems: BuilderEntry[] = [
        { ...getEntryMatchWithIdMock(), field: 'ip', value: 'some ip' },
        { ...payloadParent },
      ];

      const output = getFormattedBuilderEntries(payloadIndexPattern, payloadItems);
      const expected: FormattedBuilderEntry[] = [
        {
          id: '123',
          entryIndex: 0,
          field: {
            aggregatable: true,
            count: 0,
            esTypes: ['ip'],
            name: 'ip',
            readFromDocValues: true,
            scripted: false,
            searchable: true,
            type: 'ip',
          },
          nested: undefined,
          operator: isOperator,
          parent: undefined,
          value: 'some ip',
          correspondingKeywordField: undefined,
        },
        {
          id: '123',
          entryIndex: 1,
          field: {
            aggregatable: false,
            esTypes: ['nested'],
            name: 'nestedField',
            searchable: false,
            type: 'string',
          },
          nested: 'parent',
          operator: isOperator,
          parent: undefined,
          value: undefined,
          correspondingKeywordField: undefined,
        },
        {
          id: '123',
          entryIndex: 0,
          field: {
            aggregatable: false,
            count: 0,
            esTypes: ['text'],
            name: 'child',
            readFromDocValues: false,
            scripted: false,
            searchable: true,
            subType: {
              nested: {
                path: 'nestedField',
              },
            },
            type: 'string',
          },
          nested: 'child',
          operator: isOperator,
          parent: {
            parent: {
              id: '123',
              entries: [
                {
                  id: '123',
                  field: 'child',
                  operator: OperatorEnum.INCLUDED,
                  type: OperatorTypeEnum.MATCH,
                  value: 'some host name',
                },
              ],
              field: 'nestedField',
              type: OperatorTypeEnum.NESTED,
            },
            parentIndex: 1,
          },
          value: 'some host name',
          correspondingKeywordField: undefined,
        },
      ];
      expect(output).toEqual(expected);
    });
  });

  describe('#getUpdatedEntriesOnDelete', () => {
    test('it removes entry corresponding to "entryIndex"', () => {
      const payloadItem: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: ENTRIES_WITH_IDS,
      };
      const output = getUpdatedEntriesOnDelete(payloadItem, 0, null);
      const expected: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            id: '123',
            field: 'some.not.nested.field',
            operator: OperatorEnum.INCLUDED,
            type: OperatorTypeEnum.MATCH,
            value: 'some value',
          },
        ],
      };
      expect(output).toEqual(expected);
    });

    test('it removes nested entry of "entryIndex" with corresponding parent index', () => {
      const payloadItem: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            ...getEntryNestedWithIdMock(),
            entries: [{ ...getEntryExistsWithIdMock() }, { ...getEntryMatchAnyWithIdMock() }],
          },
        ],
      };
      const output = getUpdatedEntriesOnDelete(payloadItem, 0, 0);
      const expected: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          { ...getEntryNestedWithIdMock(), entries: [{ ...getEntryMatchAnyWithIdMock() }] },
        ],
      };
      expect(output).toEqual(expected);
    });

    test('it removes entire nested entry if after deleting specified nested entry, there are no more nested entries left', () => {
      const payloadItem: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            ...getEntryNestedWithIdMock(),
            entries: [{ ...getEntryExistsWithIdMock() }],
          },
        ],
      };
      const output = getUpdatedEntriesOnDelete(payloadItem, 0, 0);
      const expected: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [],
      };
      expect(output).toEqual(expected);
    });
  });
});
