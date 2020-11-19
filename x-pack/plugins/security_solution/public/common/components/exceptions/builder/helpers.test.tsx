/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { getListResponseMock } from '../../../../../../lists/common/schemas/response/list_schema.mock';
import {
  doesNotExistOperator,
  EXCEPTION_OPERATORS,
  EXCEPTION_OPERATORS_SANS_LISTS,
  existsOperator,
  isInListOperator,
  isNotOneOfOperator,
  isNotOperator,
  isOneOfOperator,
  isOperator,
} from '../../autocomplete/operators';
import { BuilderEntry, ExceptionsBuilderExceptionItem, FormattedBuilderEntry } from '../types';
import { IFieldType, IIndexPattern } from '../../../../../../../../src/plugins/data/common';
import { Entry, EntryNested } from '../../../../lists_plugin_deps';

import {
  getEntryFromOperator,
  getEntryOnFieldChange,
  getEntryOnListChange,
  getEntryOnMatchAnyChange,
  getEntryOnMatchChange,
  getEntryOnOperatorChange,
  getFilteredIndexPatterns,
  getFormattedBuilderEntries,
  getFormattedBuilderEntry,
  getOperatorOptions,
  getUpdatedEntriesOnDelete,
  isEntryNested,
  getCorrespondingKeywordField,
} from './helpers';
import { OperatorOption } from '../../autocomplete/types';

const getMockIndexPattern = (): IIndexPattern => ({
  id: '1234',
  title: 'logstash-*',
  fields,
});

const getMockBuilderEntry = (): FormattedBuilderEntry => ({
  field: getField('ip'),
  operator: isOperator,
  value: 'some value',
  nested: undefined,
  parent: undefined,
  entryIndex: 0,
  correspondingKeywordField: undefined,
});

const getMockNestedBuilderEntry = (): FormattedBuilderEntry => ({
  field: getField('nestedField.child'),
  operator: isOperator,
  value: 'some value',
  nested: 'child',
  parent: {
    parent: {
      ...getEntryNestedMock(),
      field: 'nestedField',
      entries: [{ ...getEntryMatchMock(), field: 'child' }],
    },
    parentIndex: 0,
  },
  entryIndex: 0,
  correspondingKeywordField: undefined,
});

const getMockNestedParentBuilderEntry = (): FormattedBuilderEntry => ({
  field: { ...getField('nestedField.child'), name: 'nestedField', esTypes: ['nested'] },
  operator: isOperator,
  value: undefined,
  nested: 'parent',
  parent: undefined,
  entryIndex: 0,
  correspondingKeywordField: undefined,
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

  describe('#getFilteredIndexPatterns', () => {
    describe('list type detections', () => {
      test('it returns nested fields that match parent value when "item.nested" is "child"', () => {
        const payloadIndexPattern: IIndexPattern = getMockIndexPattern();
        const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem, 'detection');
        const expected: IIndexPattern = {
          fields: [{ ...getField('nestedField.child'), name: 'child' }],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });

      test('it returns only parent nested field when "item.nested" is "parent" and nested parent field is not undefined', () => {
        const payloadIndexPattern: IIndexPattern = getMockIndexPattern();
        const payloadItem: FormattedBuilderEntry = getMockNestedParentBuilderEntry();
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem, 'detection');
        const expected: IIndexPattern = {
          fields: [{ ...getField('nestedField.child'), name: 'nestedField', esTypes: ['nested'] }],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });

      test('it returns only nested fields when "item.nested" is "parent" and nested parent field is undefined', () => {
        const payloadIndexPattern: IIndexPattern = getMockIndexPattern();
        const payloadItem: FormattedBuilderEntry = {
          ...getMockNestedParentBuilderEntry(),
          field: undefined,
        };
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem, 'detection');
        const expected: IIndexPattern = {
          fields: [
            { ...getField('nestedField.child') },
            { ...getField('nestedField.nestedChild.doublyNestedChild') },
          ],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });

      test('it returns all fields unfiletered if "item.nested" is not "child" or "parent"', () => {
        const payloadIndexPattern: IIndexPattern = getMockIndexPattern();
        const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem, 'detection');
        const expected: IIndexPattern = {
          fields: [...fields],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });
    });

    describe('list type endpoint', () => {
      let payloadIndexPattern: IIndexPattern = getMockIndexPattern();

      beforeAll(() => {
        payloadIndexPattern = {
          ...payloadIndexPattern,
          fields: [...payloadIndexPattern.fields, ...mockEndpointFields],
        };
      });

      test('it returns nested fields that match parent value when "item.nested" is "child"', () => {
        const payloadItem: FormattedBuilderEntry = {
          field: getEndpointField('file.Ext.code_signature.status'),
          operator: isOperator,
          value: 'some value',
          nested: 'child',
          parent: {
            parent: {
              ...getEntryNestedMock(),
              field: 'file.Ext.code_signature',
              entries: [{ ...getEntryMatchMock(), field: 'child' }],
            },
            parentIndex: 0,
          },
          entryIndex: 0,
          correspondingKeywordField: undefined,
        };
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem, 'endpoint');
        const expected: IIndexPattern = {
          fields: [{ ...getEndpointField('file.Ext.code_signature.status'), name: 'status' }],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });

      test('it returns only parent nested field when "item.nested" is "parent" and nested parent field is not undefined', () => {
        const payloadItem: FormattedBuilderEntry = {
          ...getMockNestedParentBuilderEntry(),
          field: {
            ...getEndpointField('file.Ext.code_signature.status'),
            name: 'file.Ext.code_signature',
            esTypes: ['nested'],
          },
        };
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem, 'endpoint');
        const expected: IIndexPattern = {
          fields: [
            {
              aggregatable: false,
              count: 0,
              esTypes: ['nested'],
              name: 'file.Ext.code_signature',
              readFromDocValues: false,
              scripted: false,
              searchable: true,
              subType: {
                nested: {
                  path: 'file.Ext.code_signature',
                },
              },
              type: 'string',
            },
          ],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });

      test('it returns only nested fields when "item.nested" is "parent" and nested parent field is undefined', () => {
        const payloadItem: FormattedBuilderEntry = {
          ...getMockNestedParentBuilderEntry(),
          field: undefined,
        };
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem, 'endpoint');
        const expected: IIndexPattern = {
          fields: [getEndpointField('file.Ext.code_signature.status')],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });

      test('it returns all fields that matched those in "exceptionable_fields.json" with no further filtering if "item.nested" is not "child" or "parent"', () => {
        const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
        const output = getFilteredIndexPatterns(payloadIndexPattern, payloadItem, 'endpoint');
        const expected: IIndexPattern = {
          fields: [
            {
              aggregatable: false,
              count: 0,
              esTypes: ['keyword'],
              name: 'file.path.caseless',
              readFromDocValues: false,
              scripted: false,
              searchable: true,
              type: 'string',
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
          ],
          id: '1234',
          title: 'logstash-*',
        };
        expect(output).toEqual(expected);
      });
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
        ...getEntryMatchMock(),
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
      const payloadItem: BuilderEntry = { ...getEntryMatchMock(), field: 'child' };
      const payloadParent: EntryNested = {
        ...getEntryNestedMock(),
        field: 'nestedField',
        entries: [{ ...getEntryMatchMock(), field: 'child' }],
      };
      const output = getFormattedBuilderEntry(
        payloadIndexPattern,
        payloadItem,
        0,
        payloadParent,
        1
      );
      const expected: FormattedBuilderEntry = {
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
            entries: [{ ...payloadItem }],
            field: 'nestedField',
            type: 'nested',
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
      const payloadItem: BuilderEntry = { ...getEntryMatchMock(), field: 'ip', value: 'some ip' };
      const output = getFormattedBuilderEntry(
        payloadIndexPattern,
        payloadItem,
        0,
        undefined,
        undefined
      );
      const expected: FormattedBuilderEntry = {
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
      const payload: BuilderEntry = getEntryMatchMock();
      const output = isEntryNested(payload);
      const expected = false;
      expect(output).toEqual(expected);
    });

    test('it returns "true if payload is of type EntryNested', () => {
      const payload: EntryNested = getEntryNestedMock();
      const output = isEntryNested(payload);
      const expected = true;
      expect(output).toEqual(expected);
    });
  });

  describe('#getFormattedBuilderEntries', () => {
    test('it returns formatted entry with field undefined if it unable to find a matching index pattern field', () => {
      const payloadIndexPattern: IIndexPattern = getMockIndexPattern();
      const payloadItems: BuilderEntry[] = [getEntryMatchMock()];
      const output = getFormattedBuilderEntries(payloadIndexPattern, payloadItems);
      const expected: FormattedBuilderEntry[] = [
        {
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
        { ...getEntryMatchMock(), field: 'ip', value: 'some ip' },
        { ...getEntryMatchAnyMock(), field: 'extension', value: ['some extension'] },
      ];
      const output = getFormattedBuilderEntries(payloadIndexPattern, payloadItems);
      const expected: FormattedBuilderEntry[] = [
        {
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
        ...getEntryNestedMock(),
        field: 'nestedField',
        entries: [{ ...getEntryMatchMock(), field: 'child' }],
      };
      const payloadItems: BuilderEntry[] = [
        { ...getEntryMatchMock(), field: 'ip', value: 'some ip' },
        { ...payloadParent },
      ];

      const output = getFormattedBuilderEntries(payloadIndexPattern, payloadItems);
      const expected: FormattedBuilderEntry[] = [
        {
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
              entries: [
                {
                  field: 'child',
                  operator: 'included',
                  type: 'match',
                  value: 'some host name',
                },
              ],
              field: 'nestedField',
              type: 'nested',
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
      const payloadItem: ExceptionsBuilderExceptionItem = { ...getExceptionListItemSchemaMock() };
      const output = getUpdatedEntriesOnDelete(payloadItem, 0, null);
      const expected: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'match',
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
            ...getEntryNestedMock(),
            entries: [{ ...getEntryExistsMock() }, { ...getEntryMatchAnyMock() }],
          },
        ],
      };
      const output = getUpdatedEntriesOnDelete(payloadItem, 0, 0);
      const expected: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [{ ...getEntryNestedMock(), entries: [{ ...getEntryMatchAnyMock() }] }],
      };
      expect(output).toEqual(expected);
    });

    test('it removes entire nested entry if after deleting specified nested entry, there are no more nested entries left', () => {
      const payloadItem: ExceptionsBuilderExceptionItem = {
        ...getExceptionListItemSchemaMock(),
        entries: [
          {
            ...getEntryNestedMock(),
            entries: [{ ...getEntryExistsMock() }],
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

  describe('#getEntryFromOperator', () => {
    test('it returns current value when switching from "is" to "is not"', () => {
      const payloadOperator: OperatorOption = isNotOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        value: 'I should stay the same',
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: Entry = {
        field: 'ip',
        operator: 'excluded',
        type: 'match',
        value: 'I should stay the same',
      };
      expect(output).toEqual(expected);
    });

    test('it returns current value when switching from "is not" to "is"', () => {
      const payloadOperator: OperatorOption = isOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isNotOperator,
        value: 'I should stay the same',
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: Entry = {
        field: 'ip',
        operator: 'included',
        type: 'match',
        value: 'I should stay the same',
      };
      expect(output).toEqual(expected);
    });

    test('it returns empty value when switching operator types to "match"', () => {
      const payloadOperator: OperatorOption = isOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isNotOneOfOperator,
        value: ['I should stay the same'],
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: Entry = {
        field: 'ip',
        operator: 'included',
        type: 'match',
        value: '',
      };
      expect(output).toEqual(expected);
    });

    test('it returns current value when switching from "is one of" to "is not one of"', () => {
      const payloadOperator: OperatorOption = isNotOneOfOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOneOfOperator,
        value: ['I should stay the same'],
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: Entry = {
        field: 'ip',
        operator: 'excluded',
        type: 'match_any',
        value: ['I should stay the same'],
      };
      expect(output).toEqual(expected);
    });

    test('it returns current value when switching from "is not one of" to "is one of"', () => {
      const payloadOperator: OperatorOption = isOneOfOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isNotOneOfOperator,
        value: ['I should stay the same'],
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: Entry = {
        field: 'ip',
        operator: 'included',
        type: 'match_any',
        value: ['I should stay the same'],
      };
      expect(output).toEqual(expected);
    });

    test('it returns empty value when switching operator types to "match_any"', () => {
      const payloadOperator: OperatorOption = isOneOfOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOperator,
        value: 'I should stay the same',
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: Entry = {
        field: 'ip',
        operator: 'included',
        type: 'match_any',
        value: [],
      };
      expect(output).toEqual(expected);
    });

    test('it returns current value when switching from "exists" to "does not exist"', () => {
      const payloadOperator: OperatorOption = doesNotExistOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: existsOperator,
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: Entry = {
        field: 'ip',
        operator: 'excluded',
        type: 'exists',
      };
      expect(output).toEqual(expected);
    });

    test('it returns current value when switching from "does not exist" to "exists"', () => {
      const payloadOperator: OperatorOption = existsOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: doesNotExistOperator,
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: Entry = {
        field: 'ip',
        operator: 'included',
        type: 'exists',
      };
      expect(output).toEqual(expected);
    });

    test('it returns empty value when switching operator types to "exists"', () => {
      const payloadOperator: OperatorOption = existsOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOperator,
        value: 'I should stay the same',
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: Entry = {
        field: 'ip',
        operator: 'included',
        type: 'exists',
      };
      expect(output).toEqual(expected);
    });

    test('it returns empty value when switching operator types to "list"', () => {
      const payloadOperator: OperatorOption = isInListOperator;
      const payloadEntry: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOperator,
        value: 'I should stay the same',
      };
      const output = getEntryFromOperator(payloadOperator, payloadEntry);
      const expected: Entry = {
        field: 'ip',
        operator: 'included',
        type: 'list',
        list: { id: '', type: 'ip' },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getOperatorOptions', () => {
    test('it returns "isOperator" when field type is nested but field itself has not yet been selected', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedParentBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'endpoint', false);
      const expected: OperatorOption[] = [isOperator];
      expect(output).toEqual(expected);
    });

    test('it returns "isOperator" if no field selected', () => {
      const payloadItem: FormattedBuilderEntry = { ...getMockBuilderEntry(), field: undefined };
      const output = getOperatorOptions(payloadItem, 'endpoint', false);
      const expected: OperatorOption[] = [isOperator];
      expect(output).toEqual(expected);
    });

    test('it returns "isOperator" and "isOneOfOperator" if item is nested and "listType" is "endpoint"', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'endpoint', false);
      const expected: OperatorOption[] = [isOperator, isOneOfOperator];
      expect(output).toEqual(expected);
    });

    test('it returns "isOperator" and "isOneOfOperator" if "listType" is "endpoint"', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'endpoint', false);
      const expected: OperatorOption[] = [isOperator, isOneOfOperator];
      expect(output).toEqual(expected);
    });

    test('it returns "isOperator" if "listType" is "endpoint" and field type is boolean', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'endpoint', true);
      const expected: OperatorOption[] = [isOperator];
      expect(output).toEqual(expected);
    });

    test('it returns "isOperator", "isOneOfOperator", and "existsOperator" if item is nested and "listType" is "detection"', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'detection', false);
      const expected: OperatorOption[] = [isOperator, isOneOfOperator, existsOperator];
      expect(output).toEqual(expected);
    });

    test('it returns "isOperator" and "existsOperator" if item is nested, "listType" is "detection", and field type is boolean', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'detection', true);
      const expected: OperatorOption[] = [isOperator, existsOperator];
      expect(output).toEqual(expected);
    });

    test('it returns all operator options if "listType" is "detection"', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'detection', false);
      const expected: OperatorOption[] = EXCEPTION_OPERATORS;
      expect(output).toEqual(expected);
    });

    test('it returns "isOperator", "isNotOperator", "doesNotExistOperator" and "existsOperator" if field type is boolean', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'detection', true);
      const expected: OperatorOption[] = [
        isOperator,
        isNotOperator,
        existsOperator,
        doesNotExistOperator,
      ];
      expect(output).toEqual(expected);
    });

    test('it returns list operators if specified to', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'detection', false, true);
      expect(output).toEqual(EXCEPTION_OPERATORS);
    });

    test('it does not return list operators if specified not to', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getOperatorOptions(payloadItem, 'detection', false, false);
      expect(output).toEqual(EXCEPTION_OPERATORS_SANS_LISTS);
    });
  });

  describe('#getEntryOnFieldChange', () => {
    test('it returns nested entry with single new subentry when "item.nested" is "parent"', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedParentBuilderEntry();
      const payloadIFieldType: IFieldType = getField('nestedField.child');
      const output = getEntryOnFieldChange(payloadItem, payloadIFieldType);
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [{ field: 'child', operator: 'included', type: 'match', value: '' }],
          field: 'nestedField',
          type: 'nested',
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns nested entry with newly selected field value when "item.nested" is "child"', () => {
      const payloadItem: FormattedBuilderEntry = {
        ...getMockNestedBuilderEntry(),
        parent: {
          parent: {
            ...getEntryNestedMock(),
            field: 'nestedField',
            entries: [{ ...getEntryMatchMock(), field: 'child' }, getEntryMatchAnyMock()],
          },
          parentIndex: 0,
        },
      };
      const payloadIFieldType: IFieldType = getField('nestedField.child');
      const output = getEntryOnFieldChange(payloadItem, payloadIFieldType);
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            { field: 'child', operator: 'included', type: 'match', value: '' },
            getEntryMatchAnyMock(),
          ],
          field: 'nestedField',
          type: 'nested',
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns field of type "match" with updated field if not a nested entry', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const payloadIFieldType: IFieldType = getField('ip');
      const output = getEntryOnFieldChange(payloadItem, payloadIFieldType);
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        index: 0,
        updatedEntry: {
          field: 'ip',
          operator: 'included',
          type: 'match',
          value: '',
        },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getEntryOnOperatorChange', () => {
    test('it returns updated subentry preserving its value when entry is not switching operator types', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const payloadOperator: OperatorOption = isNotOperator;
      const output = getEntryOnOperatorChange(payloadItem, payloadOperator);
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        updatedEntry: { field: 'ip', type: 'match', value: 'some value', operator: 'excluded' },
        index: 0,
      };
      expect(output).toEqual(expected);
    });

    test('it returns updated subentry resetting its value when entry is switching operator types', () => {
      const payloadItem: FormattedBuilderEntry = getMockBuilderEntry();
      const payloadOperator: OperatorOption = isOneOfOperator;
      const output = getEntryOnOperatorChange(payloadItem, payloadOperator);
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        updatedEntry: { field: 'ip', type: 'match_any', value: [], operator: 'included' },
        index: 0,
      };
      expect(output).toEqual(expected);
    });

    test('it returns updated subentry preserving its value when entry is nested and not switching operator types', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
      const payloadOperator: OperatorOption = isNotOperator;
      const output = getEntryOnOperatorChange(payloadItem, payloadOperator);
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: 'child',
              operator: 'excluded',
              type: 'match',
              value: 'some value',
            },
          ],
          field: 'nestedField',
          type: 'nested',
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns updated subentry resetting its value when entry is nested and switching operator types', () => {
      const payloadItem: FormattedBuilderEntry = getMockNestedBuilderEntry();
      const payloadOperator: OperatorOption = isOneOfOperator;
      const output = getEntryOnOperatorChange(payloadItem, payloadOperator);
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: 'child',
              operator: 'included',
              type: 'match_any',
              value: [],
            },
          ],
          field: 'nestedField',
          type: 'nested',
        },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getEntryOnMatchChange', () => {
    test('it returns entry with updated value', () => {
      const payload: FormattedBuilderEntry = getMockBuilderEntry();
      const output = getEntryOnMatchChange(payload, 'jibber jabber');
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        updatedEntry: { field: 'ip', type: 'match', value: 'jibber jabber', operator: 'included' },
        index: 0,
      };
      expect(output).toEqual(expected);
    });

    test('it returns entry with updated value and "field" of empty string if entry does not have a "field" defined', () => {
      const payload: FormattedBuilderEntry = { ...getMockBuilderEntry(), field: undefined };
      const output = getEntryOnMatchChange(payload, 'jibber jabber');
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        updatedEntry: { field: '', type: 'match', value: 'jibber jabber', operator: 'included' },
        index: 0,
      };
      expect(output).toEqual(expected);
    });

    test('it returns nested entry with updated value', () => {
      const payload: FormattedBuilderEntry = getMockNestedBuilderEntry();
      const output = getEntryOnMatchChange(payload, 'jibber jabber');
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: 'child',
              operator: 'included',
              type: 'match',
              value: 'jibber jabber',
            },
          ],
          field: 'nestedField',
          type: 'nested',
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns nested entry with updated value and "field" of empty string if entry does not have a "field" defined', () => {
      const payload: FormattedBuilderEntry = { ...getMockNestedBuilderEntry(), field: undefined };
      const output = getEntryOnMatchChange(payload, 'jibber jabber');
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: '',
              operator: 'included',
              type: 'match',
              value: 'jibber jabber',
            },
          ],
          field: 'nestedField',
          type: 'nested',
        },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getEntryOnMatchAnyChange', () => {
    test('it returns entry with updated value', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOneOfOperator,
        value: ['some value'],
      };
      const output = getEntryOnMatchAnyChange(payload, ['jibber jabber']);
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        updatedEntry: {
          field: 'ip',
          type: 'match_any',
          value: ['jibber jabber'],
          operator: 'included',
        },
        index: 0,
      };
      expect(output).toEqual(expected);
    });

    test('it returns entry with updated value and "field" of empty string if entry does not have a "field" defined', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOneOfOperator,
        value: ['some value'],
        field: undefined,
      };
      const output = getEntryOnMatchAnyChange(payload, ['jibber jabber']);
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        updatedEntry: {
          field: '',
          type: 'match_any',
          value: ['jibber jabber'],
          operator: 'included',
        },
        index: 0,
      };
      expect(output).toEqual(expected);
    });

    test('it returns nested entry with updated value', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockNestedBuilderEntry(),
        parent: {
          parent: {
            ...getEntryNestedMock(),
            field: 'nestedField',
            entries: [{ ...getEntryMatchAnyMock(), field: 'child' }],
          },
          parentIndex: 0,
        },
      };
      const output = getEntryOnMatchAnyChange(payload, ['jibber jabber']);
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: 'child',
              operator: 'included',
              type: 'match_any',
              value: ['jibber jabber'],
            },
          ],
          field: 'nestedField',
          type: 'nested',
        },
      };
      expect(output).toEqual(expected);
    });

    test('it returns nested entry with updated value and "field" of empty string if entry does not have a "field" defined', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockNestedBuilderEntry(),
        field: undefined,
        parent: {
          parent: {
            ...getEntryNestedMock(),
            field: 'nestedField',
            entries: [{ ...getEntryMatchAnyMock(), field: 'child' }],
          },
          parentIndex: 0,
        },
      };
      const output = getEntryOnMatchAnyChange(payload, ['jibber jabber']);
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        index: 0,
        updatedEntry: {
          entries: [
            {
              field: '',
              operator: 'included',
              type: 'match_any',
              value: ['jibber jabber'],
            },
          ],
          field: 'nestedField',
          type: 'nested',
        },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getEntryOnListChange', () => {
    test('it returns entry with updated value', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOneOfOperator,
        value: '1234',
      };
      const output = getEntryOnListChange(payload, getListResponseMock());
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        updatedEntry: {
          field: 'ip',
          type: 'list',
          list: { id: 'some-list-id', type: 'ip' },
          operator: 'included',
        },
        index: 0,
      };
      expect(output).toEqual(expected);
    });

    test('it returns entry with updated value and "field" of empty string if entry does not have a "field" defined', () => {
      const payload: FormattedBuilderEntry = {
        ...getMockBuilderEntry(),
        operator: isOneOfOperator,
        value: '1234',
        field: undefined,
      };
      const output = getEntryOnListChange(payload, getListResponseMock());
      const expected: { updatedEntry: BuilderEntry; index: number } = {
        updatedEntry: {
          field: '',
          type: 'list',
          list: { id: 'some-list-id', type: 'ip' },
          operator: 'included',
        },
        index: 0,
      };
      expect(output).toEqual(expected);
    });
  });
});
