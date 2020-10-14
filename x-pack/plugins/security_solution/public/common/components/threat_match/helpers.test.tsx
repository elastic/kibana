/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  fields,
  getField,
} from '../../../../../../../src/plugins/data/common/index_patterns/fields/fields.mocks';
import { Entry, EmptyEntry, ThreatMapEntries, FormattedEntry } from './types';
import { IndexPattern } from '../../../../../../../src/plugins/data/common';
import moment from 'moment-timezone';

import {
  filterItems,
  getEntryOnFieldChange,
  getFormattedEntries,
  getFormattedEntry,
  getUpdatedEntriesOnDelete,
} from './helpers';
import { ThreatMapEntry } from '../../../../common/detection_engine/schemas/types';

const getMockIndexPattern = (): IndexPattern =>
  ({
    id: '1234',
    title: 'logstash-*',
    fields,
  } as IndexPattern);

const getMockEntry = (): FormattedEntry => ({
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
  });

  describe('#getFormattedEntry', () => {
    test('it returns entry with a value when "item.field" is of type "text" and matching keyword field exists', () => {
      const payloadIndexPattern: IndexPattern = {
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
      } as IndexPattern;
      const payloadItem: Entry = {
        field: 'machine.os.raw.text',
        type: 'mapping',
        value: 'some os',
      };
      const output = getFormattedEntry(payloadIndexPattern, payloadIndexPattern, payloadItem, 0);
      const expected: FormattedEntry = {
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
          },
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
          },
          value: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          },
          type: 'mapping',
        },
      ];
      expect(output).toEqual(expected);
    });

    test('it returns formatted entries', () => {
      const payloadIndexPattern: IndexPattern = getMockIndexPattern();
      const payloadItems: Entry[] = [
        { field: 'machine.os', type: 'mapping', value: 'machine.os' },
        { field: 'ip', type: 'mapping', value: 'ip' },
      ];
      const output = getFormattedEntries(payloadIndexPattern, payloadIndexPattern, payloadItems);
      const expected: FormattedEntry[] = [
        {
          field: {
            name: 'machine.os',
            type: 'string',
            esTypes: ['text'],
            count: 0,
            scripted: false,
            searchable: true,
            aggregatable: true,
            readFromDocValues: false,
          },
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
          },
          entryIndex: 0,
        },
        {
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
      const expected: { updatedEntry: Entry; index: number } = {
        index: 0,
        updatedEntry: {
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
});
