/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';

import { getFormattedEntries, formatEntry, getDescriptionListContent } from './helpers';
import { FormattedEntry, DescriptionListItem } from '../types';
import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntriesArrayMock } from '../../../../../../lists/common/schemas/types/entries.mock';
import { getEntryMatchMock } from '../../../../../../lists/common/schemas/types/entry_match.mock';
import { getEntryMatchAnyMock } from '../../../../../../lists/common/schemas/types/entry_match_any.mock';
import { getEntryExistsMock } from '../../../../../../lists/common/schemas/types/entry_exists.mock';

describe('Exception viewer helpers', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  describe('#getFormattedEntries', () => {
    test('it returns empty array if no entries passed', () => {
      const result = getFormattedEntries([]);

      expect(result).toEqual([]);
    });

    test('it formats nested entries as expected', () => {
      const payload = [getEntryMatchMock()];
      const result = getFormattedEntries(payload);
      const expected: FormattedEntry[] = [
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is',
          value: 'some host name',
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it formats "exists" entries as expected', () => {
      const payload = [getEntryExistsMock()];
      const result = getFormattedEntries(payload);
      const expected: FormattedEntry[] = [
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'exists',
          value: undefined,
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it formats non-nested entries as expected', () => {
      const payload = [getEntryMatchAnyMock(), getEntryMatchMock()];
      const result = getFormattedEntries(payload);
      const expected: FormattedEntry[] = [
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is one of',
          value: ['some host name'],
        },
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is',
          value: 'some host name',
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it formats a mix of nested and non-nested entries as expected', () => {
      const payload = getEntriesArrayMock();
      const result = getFormattedEntries(payload);
      const expected: FormattedEntry[] = [
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is',
          value: 'some host name',
        },
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is one of',
          value: ['some host name'],
        },
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'exists',
          value: undefined,
        },
        {
          fieldName: 'parent.field',
          isNested: false,
          operator: undefined,
          value: undefined,
        },
        {
          fieldName: 'host.name',
          isNested: true,
          operator: 'is',
          value: 'some host name',
        },
        {
          fieldName: 'host.name',
          isNested: true,
          operator: 'is one of',
          value: ['some host name'],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('#formatEntry', () => {
    test('it formats an entry', () => {
      const payload = getEntryMatchMock();
      const formattedEntry = formatEntry({ isNested: false, item: payload });
      const expected: FormattedEntry = {
        fieldName: 'host.name',
        isNested: false,
        operator: 'is',
        value: 'some host name',
      };

      expect(formattedEntry).toEqual(expected);
    });

    test('it formats as expected when "isNested" is "true"', () => {
      const payload = getEntryMatchMock();
      const formattedEntry = formatEntry({ isNested: true, item: payload });
      const expected: FormattedEntry = {
        fieldName: 'host.name',
        isNested: true,
        operator: 'is',
        value: 'some host name',
      };

      expect(formattedEntry).toEqual(expected);
    });
  });

  describe('#getDescriptionListContent', () => {
    test('it returns formatted description list with os if one is specified', () => {
      const payload = getExceptionListItemSchemaMock({ os_types: ['linux'] });
      payload.description = '';
      const result = getDescriptionListContent(payload);
      const expected: DescriptionListItem[] = [
        {
          description: 'Linux',
          title: 'OS',
        },
        {
          description: 'April 20th 2020 @ 15:25:31',
          title: 'Date created',
        },
        {
          description: 'some user',
          title: 'Created by',
        },
      ];

      expect(result).toEqual(expected);
    });

    test('it returns formatted description list with a description if one specified', () => {
      const payload = getExceptionListItemSchemaMock({ os_types: ['linux'] });
      payload.description = 'Im a description';
      const result = getDescriptionListContent(payload);
      const expected: DescriptionListItem[] = [
        {
          description: 'Linux',
          title: 'OS',
        },
        {
          description: 'April 20th 2020 @ 15:25:31',
          title: 'Date created',
        },
        {
          description: 'some user',
          title: 'Created by',
        },
        {
          description: 'Im a description',
          title: 'Description',
        },
      ];

      expect(result).toEqual(expected);
    });

    test('it returns just user and date created if no other fields specified', () => {
      const payload = getExceptionListItemSchemaMock({ os_types: ['linux'] });
      payload.description = '';
      const result = getDescriptionListContent(payload);
      const expected: DescriptionListItem[] = [
        {
          description: 'Linux',
          title: 'OS',
        },
        {
          description: 'April 20th 2020 @ 15:25:31',
          title: 'Date created',
        },
        {
          description: 'some user',
          title: 'Created by',
        },
      ];

      expect(result).toEqual(expected);
    });

    test('it returns Modified By/On info. when `includeModified` is true', () => {
      const result = getDescriptionListContent(
        getExceptionListItemSchemaMock({ os_types: ['linux'] }),
        true
      );
      expect(result).toEqual([
        {
          description: 'Linux',
          title: 'OS',
        },
        {
          description: 'April 20th 2020 @ 15:25:31',
          title: 'Date created',
        },
        {
          description: 'some user',
          title: 'Created by',
        },
        {
          description: 'April 20th 2020 @ 15:25:31',
          title: 'Date modified',
        },
        {
          description: 'some user',
          title: 'Modified by',
        },
        {
          description: 'some description',
          title: 'Description',
        },
      ]);
    });

    test('it returns Name when `includeName` is true', () => {
      const result = getDescriptionListContent(
        getExceptionListItemSchemaMock({ os_types: ['linux'] }),
        false,
        true
      );
      expect(result).toEqual([
        {
          description: 'some name',
          title: 'Name',
        },
        {
          description: 'Linux',
          title: 'OS',
        },
        {
          description: 'April 20th 2020 @ 15:25:31',
          title: 'Date created',
        },
        {
          description: 'some user',
          title: 'Created by',
        },
        {
          description: 'some description',
          title: 'Description',
        },
      ]);
    });
  });
});
