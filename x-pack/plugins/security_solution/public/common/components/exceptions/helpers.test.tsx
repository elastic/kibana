/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount } from 'enzyme';
import moment from 'moment-timezone';

import {
  getOperatorType,
  getExceptionOperatorSelect,
  getFormattedEntries,
  formatEntry,
  getOperatingSystems,
  getTagsInclude,
  getDescriptionListContent,
  getFormattedComments,
  filterExceptionItems,
  getNewExceptionItem,
} from './helpers';
import { FormattedEntry, DescriptionListItem, EmptyEntry } from './types';
import {
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  isInListOperator,
  isNotInListOperator,
  existsOperator,
  doesNotExistOperator,
} from '../autocomplete/operators';
import { OperatorTypeEnum, OperatorEnum } from '../../../lists_plugin_deps';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import {
  getEntryExistsMock,
  getEntryListMock,
  getEntryMatchMock,
  getEntryMatchAnyMock,
  getEntriesArrayMock,
} from '../../../../../lists/common/schemas/types/entries.mock';
import { getCommentsArrayMock } from '../../../../../lists/common/schemas/types/comments.mock';

describe('Exception helpers', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  describe('#getOperatorType', () => {
    test('returns operator type "match" if entry.type is "match"', () => {
      const payload = getEntryMatchMock();
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorTypeEnum.MATCH);
    });

    test('returns operator type "match_any" if entry.type is "match_any"', () => {
      const payload = getEntryMatchAnyMock();
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorTypeEnum.MATCH_ANY);
    });

    test('returns operator type "list" if entry.type is "list"', () => {
      const payload = getEntryListMock();
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorTypeEnum.LIST);
    });

    test('returns operator type "exists" if entry.type is "exists"', () => {
      const payload = getEntryExistsMock();
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorTypeEnum.EXISTS);
    });
  });

  describe('#getExceptionOperatorSelect', () => {
    test('it returns "isOperator" when "operator" is "included" and operator type is "match"', () => {
      const payload = getEntryMatchMock();
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isOperator);
    });

    test('it returns "isNotOperator" when "operator" is "excluded" and operator type is "match"', () => {
      const payload = getEntryMatchMock();
      payload.operator = 'excluded';
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isNotOperator);
    });

    test('it returns "isOneOfOperator" when "operator" is "included" and operator type is "match_any"', () => {
      const payload = getEntryMatchAnyMock();
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isOneOfOperator);
    });

    test('it returns "isNotOneOfOperator" when "operator" is "excluded" and operator type is "match_any"', () => {
      const payload = getEntryMatchAnyMock();
      payload.operator = 'excluded';
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isNotOneOfOperator);
    });

    test('it returns "existsOperator" when "operator" is "included" and no operator type is provided', () => {
      const payload = getEntryExistsMock();
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(existsOperator);
    });

    test('it returns "doesNotExistsOperator" when "operator" is "excluded" and no operator type is provided', () => {
      const payload = getEntryExistsMock();
      payload.operator = 'excluded';
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(doesNotExistOperator);
    });

    test('it returns "isInList" when "operator" is "included" and operator type is "list"', () => {
      const payload = getEntryListMock();
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isInListOperator);
    });

    test('it returns "isNotInList" when "operator" is "excluded" and operator type is "list"', () => {
      const payload = getEntryListMock();
      payload.operator = 'excluded';
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isNotInListOperator);
    });
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
          operator: 'is in list',
          value: 'some-list-id',
        },
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'exists',
          value: undefined,
        },
        {
          fieldName: 'host.name',
          isNested: false,
          operator: undefined,
          value: undefined,
        },
        {
          fieldName: 'host.name.host.name',
          isNested: true,
          operator: 'is',
          value: 'some host name',
        },
        {
          fieldName: 'host.name.host.name',
          isNested: true,
          operator: 'is',
          value: 'some host name',
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
      const formattedEntry = formatEntry({ isNested: true, parent: 'parent', item: payload });
      const expected: FormattedEntry = {
        fieldName: 'parent.host.name',
        isNested: true,
        operator: 'is',
        value: 'some host name',
      };

      expect(formattedEntry).toEqual(expected);
    });
  });

  describe('#getOperatingSystems', () => {
    test('it returns null if no operating system tag specified', () => {
      const result = getOperatingSystems(['some tag', 'some other tag']);

      expect(result).toEqual('');
    });

    test('it returns null if operating system tag malformed', () => {
      const result = getOperatingSystems(['some tag', 'jibberos:mac,windows', 'some other tag']);

      expect(result).toEqual('');
    });

    test('it returns formatted operating systems if space included in os tag', () => {
      const result = getOperatingSystems(['some tag', 'os: mac', 'some other tag']);

      expect(result).toEqual('Mac');
    });

    test('it returns formatted operating systems if multiple os tags specified', () => {
      const result = getOperatingSystems(['some tag', 'os: mac', 'some other tag', 'os:windows']);

      expect(result).toEqual('Mac, Windows');
    });
  });

  describe('#getTagsInclude', () => {
    test('it returns a tuple of "false" and "null" if no matches found', () => {
      const result = getTagsInclude({ tags: ['some', 'tags', 'here'], regex: /(no match)/ });

      expect(result).toEqual([false, null]);
    });

    test('it returns a tuple of "true" and matching string if matches found', () => {
      const result = getTagsInclude({ tags: ['some', 'tags', 'here'], regex: /(some)/ });

      expect(result).toEqual([true, 'some']);
    });
  });

  describe('#getDescriptionListContent', () => {
    test('it returns formatted description list with os if one is specified', () => {
      const payload = getExceptionListItemSchemaMock();
      payload.description = '';
      const result = getDescriptionListContent(payload);
      const expected: DescriptionListItem[] = [
        {
          description: 'Linux',
          title: 'OS',
        },
        {
          description: 'April 23rd 2020 @ 00:19:13',
          title: 'Date created',
        },
        {
          description: 'user_name',
          title: 'Created by',
        },
      ];

      expect(result).toEqual(expected);
    });

    test('it returns formatted description list with a description if one specified', () => {
      const payload = getExceptionListItemSchemaMock();
      payload._tags = [];
      payload.description = 'Im a description';
      const result = getDescriptionListContent(payload);
      const expected: DescriptionListItem[] = [
        {
          description: 'April 23rd 2020 @ 00:19:13',
          title: 'Date created',
        },
        {
          description: 'user_name',
          title: 'Created by',
        },
        {
          description: 'Im a description',
          title: 'Comment',
        },
      ];

      expect(result).toEqual(expected);
    });

    test('it returns just user and date created if no other fields specified', () => {
      const payload = getExceptionListItemSchemaMock();
      payload._tags = [];
      payload.description = '';
      const result = getDescriptionListContent(payload);
      const expected: DescriptionListItem[] = [
        {
          description: 'April 23rd 2020 @ 00:19:13',
          title: 'Date created',
        },
        {
          description: 'user_name',
          title: 'Created by',
        },
      ];

      expect(result).toEqual(expected);
    });
  });

  describe('#getFormattedComments', () => {
    test('it returns formatted comment object with username and timestamp', () => {
      const payload = getCommentsArrayMock();
      const result = getFormattedComments(payload);

      expect(result[0].username).toEqual('some user');
      expect(result[0].timestamp).toEqual('on Apr 20th 2020 @ 15:25:31');
    });

    test('it returns formatted timeline icon with comment users initial', () => {
      const payload = getCommentsArrayMock();
      const result = getFormattedComments(payload);

      const wrapper = mount<React.ReactElement>(result[0].timelineIcon as React.ReactElement);

      expect(wrapper.text()).toEqual('SU');
    });

    test('it returns comment text', () => {
      const payload = getCommentsArrayMock();
      const result = getFormattedComments(payload);

      const wrapper = mount<React.ReactElement>(result[0].children as React.ReactElement);

      expect(wrapper.text()).toEqual('some old comment');
    });
  });

  describe('#filterExceptionItems', () => {
    test('it removes empty entry items', () => {
      const { entries, ...rest } = getExceptionListItemSchemaMock();
      const mockEmptyException: EmptyEntry = {
        field: 'host.name',
        type: OperatorTypeEnum.MATCH,
        operator: OperatorEnum.INCLUDED,
        value: undefined,
      };
      const exceptions = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(exceptions).toEqual([getExceptionListItemSchemaMock()]);
    });

    test('it removes `temporaryId` from items', () => {
      const { meta, ...rest } = getNewExceptionItem({
        listType: 'detection',
        listId: '123',
        namespaceType: 'single',
        ruleName: 'rule name',
      });
      const exceptions = filterExceptionItems([{ ...rest, meta }]);

      expect(exceptions).toEqual([{ ...rest, meta: undefined }]);
    });
  });
});
