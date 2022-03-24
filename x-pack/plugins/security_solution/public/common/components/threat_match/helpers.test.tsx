/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fields, getField } from '../../../../../../../src/plugins/data/common/mocks';
import { Entry, EmptyEntry, ThreatMapEntries, FormattedEntry } from './types';
import type { FieldSpec } from '../../../../../../../src/plugins/data/common';
import type { DataViewBase } from '@kbn/es-query';
import moment from 'moment-timezone';

import {
  filterItems,
  getEntryOnFieldChange,
  getFormattedEntries,
  getFormattedEntry,
  getUpdatedEntriesOnDelete,
  customValidators,
} from './helpers';
import { ThreatMapEntry } from '@kbn/securitysolution-io-ts-alerting-types';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('123'),
}));

const getMockIndexPattern = (): DataViewBase =>
  ({
    id: '1234',
    title: 'logstash-*',
    fields,
  } as DataViewBase);

const getMockEntry = (): FormattedEntry => ({
  id: '123',
  field: getField('ip'),
  value: getField('ip'),
  type: 'mapping',
  entryIndex: 0,
});

describe('Helpers', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
    jest.clearAllMocks();
  });

  describe('#getFormattedEntry', () => {
    test('it returns entry with a value when "item.field" is of type "text" and matching keyword field exists', () => {
      const payloadIndexPattern: DataViewBase = {
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
      } as DataViewBase;
      const payloadItem: Entry = {
        field: 'machine.os.raw.text',
        type: 'mapping',
        value: 'some os',
      };
      const output = getFormattedEntry(payloadIndexPattern, payloadIndexPattern, payloadItem, 0);
      const expected: FormattedEntry = {
        entryIndex: 0,
        id: '123',
        field: {
          name: 'machine.os.raw.text',
          type: 'string',
          esTypes: ['text'],
          count: 0,
          scripted: false,
          searchable: false,
          aggregatable: false,
          readFromDocValues: true,
        } as FieldSpec,
        type: 'mapping',
        value: undefined,
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getFormattedEntries', () => {
    test('it returns formatted entry with field and value undefined if it unable to find a matching index pattern field', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const payloadItems: Entry[] = [{ field: 'field.one', type: 'mapping', value: 'field.one' }];
      const output = getFormattedEntries(payloadIndexPattern, payloadIndexPattern, payloadItems);
      const expected: FormattedEntry[] = [
        {
          id: '123',
          entryIndex: 0,
          field: undefined,
          value: undefined,
          type: 'mapping',
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns "undefined" value if cannot match a pattern field', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const payloadItems: Entry[] = [{ field: 'machine.os', type: 'mapping', value: 'yolo' }];
      const output = getFormattedEntries(payloadIndexPattern, payloadIndexPattern, payloadItems);
      const expected: FormattedEntry[] = [
        {
          id: '123',
          entryIndex: 0,
          field: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          } as FieldSpec,
          value: undefined,
          type: 'mapping',
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns value and field when they match two independent index patterns', () => {
      const payloadIndexPattern = getMockIndexPattern();
      const threatIndexPattern = getMockIndexPattern();
      const payloadItems: Entry[] = [{ field: 'machine.os', type: 'mapping', value: 'machine.os' }];
      const output = getFormattedEntries(payloadIndexPattern, threatIndexPattern, payloadItems);
      const expected: FormattedEntry[] = [
        {
          id: '123',
          entryIndex: 0,
          field: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          } as FieldSpec,
          value: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          } as FieldSpec,
          type: 'mapping',
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns formatted entries', () => {
      const payloadIndexPattern: DataViewBase = getMockIndexPattern();
      const payloadItems: Entry[] = [
        { field: 'machine.os', type: 'mapping', value: 'machine.os' },
        { field: 'ip', type: 'mapping', value: 'ip' },
      ];
      const output = getFormattedEntries(payloadIndexPattern, payloadIndexPattern, payloadItems);
      const expected: FormattedEntry[] = [
        {
          id: '123',
          field: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          } as FieldSpec,
          type: 'mapping',
          value: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          } as FieldSpec,
          entryIndex: 0,
        },
        {
          id: '123',
          field: {
            name: 'ip',
            type: 'ip',
            esTypes: ['ip'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: true,
          },
          type: 'mapping',
          value: {
            name: 'ip',
            type: 'ip',
            esTypes: ['ip'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: true,
          },
          entryIndex: 1,
        },
      ];
      expect(output).toEqual(expected);
    });
  });

  describe('#getUpdatedEntriesOnDelete', () => {
    test('it removes entry corresponding to "entryIndex"', () => {
      const payloadItem: ThreatMapEntries = {
        entries: [
          { field: 'field.one', type: 'mapping', value: 'field.one' },
          { field: 'field.two', type: 'mapping', value: 'field.two' },
        ],
      };
      const output = getUpdatedEntriesOnDelete(payloadItem, 0);
      const expected: ThreatMapEntries = {
        entries: [
          {
            field: 'field.two',
            type: 'mapping',
            value: 'field.two',
          },
        ],
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#getEntryOnFieldChange', () => {
    test('it returns field of type "match" with updated field', () => {
      const payloadItem = getMockEntry();
      const payloadIFieldType = getField('ip');
      const output = getEntryOnFieldChange(payloadItem, payloadIFieldType);
      const expected: { updatedEntry: Entry & { id: string }; index: number } = {
        index: 0,
        updatedEntry: {
          id: '123',
          field: 'ip',
          type: 'mapping',
          value: 'ip',
        },
      };
      expect(output).toEqual(expected);
    });
  });

  describe('#filterItems', () => {
    test('it removes entry items with "value" of "undefined"', () => {
      const entry: ThreatMapEntry = { field: 'host.name', type: 'mapping', value: 'host.name' };
      const mockEmpty: EmptyEntry = {
        field: 'host.name',
        type: 'mapping',
        value: undefined,
      };
      const items = filterItems([
        {
          entries: [entry],
        },
        {
          entries: [mockEmpty],
        },
      ]);
      expect(items).toEqual([{ entries: [entry] }]);
    });
  });

  describe('customValidators.forbiddenField', () => {
    const FORBIDDEN = '*';

    test('it returns expected value when a forbidden value is passed in', () => {
      expect(customValidators.forbiddenField('*', FORBIDDEN)).toEqual({
        code: 'ERR_FIELD_FORMAT',
        message: 'The index pattern cannot be *. Please choose a more specific index pattern.',
      });
    });

    test('it returns undefined when a non-forbidden value is passed in', () => {
      expect(customValidators.forbiddenField('.test-index', FORBIDDEN)).not.toBeDefined();
    });
  });
});
