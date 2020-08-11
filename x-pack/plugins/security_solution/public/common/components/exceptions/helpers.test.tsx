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
  getOperatingSystems,
  getTagsInclude,
  getFormattedComments,
  filterExceptionItems,
  getNewExceptionItem,
  formatOperatingSystems,
  getEntryValue,
  formatExceptionItemForUpdate,
  enrichNewExceptionItemsWithComments,
  enrichExistingExceptionItemWithComments,
  enrichExceptionItemsWithOS,
  entryHasListType,
  entryHasNonEcsType,
  prepareExceptionItemsForBulkClose,
  lowercaseHashValues,
} from './helpers';
import { EmptyEntry } from './types';
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
import { OperatorTypeEnum, OperatorEnum, EntryNested } from '../../../shared_imports';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getEntryMatchMock } from '../../../../../lists/common/schemas/types/entry_match.mock';
import { getEntryMatchAnyMock } from '../../../../../lists/common/schemas/types/entry_match_any.mock';
import { getEntryExistsMock } from '../../../../../lists/common/schemas/types/entry_exists.mock';
import { getEntryListMock } from '../../../../../lists/common/schemas/types/entry_list.mock';
import { getCommentsArrayMock } from '../../../../../lists/common/schemas/types/comment.mock';
import { ENTRIES, OLD_DATE_RELATIVE_TO_DATE_NOW } from '../../../../../lists/common/constants.mock';
import {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
  EntriesArray,
} from '../../../../../lists/common/schemas';
import { IIndexPattern } from 'src/plugins/data/common';

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

  describe('#getEntryValue', () => {
    it('returns "match" entry value', () => {
      const payload = getEntryMatchMock();
      const result = getEntryValue(payload);
      const expected = 'some host name';
      expect(result).toEqual(expected);
    });

    it('returns "match any" entry values', () => {
      const payload = getEntryMatchAnyMock();
      const result = getEntryValue(payload);
      const expected = ['some host name'];
      expect(result).toEqual(expected);
    });

    it('returns "exists" entry value', () => {
      const payload = getEntryExistsMock();
      const result = getEntryValue(payload);
      const expected = undefined;
      expect(result).toEqual(expected);
    });

    it('returns "list" entry value', () => {
      const payload = getEntryListMock();
      const result = getEntryValue(payload);
      const expected = 'some-list-id';
      expect(result).toEqual(expected);
    });
  });

  describe('#getOperatingSystems', () => {
    test('it returns null if no operating system tag specified', () => {
      const result = getOperatingSystems(['some tag', 'some other tag']);

      expect(result).toEqual([]);
    });

    test('it returns null if operating system tag malformed', () => {
      const result = getOperatingSystems(['some tag', 'jibberos:mac,windows', 'some other tag']);

      expect(result).toEqual([]);
    });

    test('it returns operating systems if space included in os tag', () => {
      const result = getOperatingSystems(['some tag', 'os: macos', 'some other tag']);
      expect(result).toEqual(['macos']);
    });

    test('it returns operating systems if multiple os tags specified', () => {
      const result = getOperatingSystems(['some tag', 'os: macos', 'some other tag', 'os:windows']);
      expect(result).toEqual(['macos', 'windows']);
    });
  });

  describe('#formatOperatingSystems', () => {
    test('it returns null if no operating system tag specified', () => {
      const result = formatOperatingSystems(getOperatingSystems(['some tag', 'some other tag']));

      expect(result).toEqual('');
    });

    test('it returns null if operating system tag malformed', () => {
      const result = formatOperatingSystems(
        getOperatingSystems(['some tag', 'jibberos:mac,windows', 'some other tag'])
      );

      expect(result).toEqual('');
    });

    test('it returns formatted operating systems if space included in os tag', () => {
      const result = formatOperatingSystems(
        getOperatingSystems(['some tag', 'os: macos', 'some other tag'])
      );

      expect(result).toEqual('macOS');
    });

    test('it returns formatted operating systems if multiple os tags specified', () => {
      const result = formatOperatingSystems(
        getOperatingSystems(['some tag', 'os: macos', 'some other tag', 'os:windows'])
      );

      expect(result).toEqual('macOS, Windows');
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
    test('it removes entry items with "value" of "undefined"', () => {
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

    test('it removes "match" entry items with "value" of empty string', () => {
      const { entries, ...rest } = { ...getExceptionListItemSchemaMock() };
      const mockEmptyException: EmptyEntry = {
        field: 'host.name',
        type: OperatorTypeEnum.MATCH,
        operator: OperatorEnum.INCLUDED,
        value: '',
      };
      const output: Array<
        ExceptionListItemSchema | CreateExceptionListItemSchema
      > = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(output).toEqual([{ ...getExceptionListItemSchemaMock() }]);
    });

    test('it removes "match" entry items with "field" of empty string', () => {
      const { entries, ...rest } = { ...getExceptionListItemSchemaMock() };
      const mockEmptyException: EmptyEntry = {
        field: '',
        type: OperatorTypeEnum.MATCH,
        operator: OperatorEnum.INCLUDED,
        value: 'some value',
      };
      const output: Array<
        ExceptionListItemSchema | CreateExceptionListItemSchema
      > = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(output).toEqual([{ ...getExceptionListItemSchemaMock() }]);
    });

    test('it removes "match_any" entry items with "field" of empty string', () => {
      const { entries, ...rest } = { ...getExceptionListItemSchemaMock() };
      const mockEmptyException: EmptyEntry = {
        field: '',
        type: OperatorTypeEnum.MATCH_ANY,
        operator: OperatorEnum.INCLUDED,
        value: ['some value'],
      };
      const output: Array<
        ExceptionListItemSchema | CreateExceptionListItemSchema
      > = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(output).toEqual([{ ...getExceptionListItemSchemaMock() }]);
    });

    test('it removes "nested" entry items with "field" of empty string', () => {
      const { entries, ...rest } = { ...getExceptionListItemSchemaMock() };
      const mockEmptyException: EntryNested = {
        field: '',
        type: OperatorTypeEnum.NESTED,
        entries: [getEntryMatchMock()],
      };
      const output: Array<
        ExceptionListItemSchema | CreateExceptionListItemSchema
      > = filterExceptionItems([
        {
          ...rest,
          entries: [...entries, mockEmptyException],
        },
      ]);

      expect(output).toEqual([{ ...getExceptionListItemSchemaMock() }]);
    });

    test('it removes `temporaryId` from items', () => {
      const { meta, ...rest } = getNewExceptionItem({
        listType: 'detection',
        listId: '123',
        namespaceType: 'single',
        ruleName: 'rule name',
      });
      const exceptions = filterExceptionItems([{ ...rest, meta }]);

      expect(exceptions).toEqual([{ ...rest, entries: [], meta: undefined }]);
    });
  });

  describe('#formatExceptionItemForUpdate', () => {
    test('it should return correct update fields', () => {
      const payload = getExceptionListItemSchemaMock();
      const result = formatExceptionItemForUpdate(payload);
      const expected = {
        _tags: ['endpoint', 'process', 'malware', 'os:linux'],
        comments: [],
        description: 'some description',
        entries: ENTRIES,
        id: '1',
        item_id: 'endpoint_list_item',
        meta: {},
        name: 'some name',
        namespace_type: 'single',
        tags: ['user added string for a tag', 'malware'],
        type: 'simple',
      };
      expect(result).toEqual(expected);
    });
  });
  describe('#enrichExistingExceptionItemWithComments', () => {
    test('it should return exception item with comments stripped of "created_by", "created_at", "updated_by", "updated_at" fields', () => {
      const payload = getExceptionListItemSchemaMock();
      const comments = [
        {
          comment: 'Im an existing comment',
          created_at: OLD_DATE_RELATIVE_TO_DATE_NOW,
          created_by: 'lily',
          id: '1',
        },
        {
          comment: 'Im another existing comment',
          created_at: OLD_DATE_RELATIVE_TO_DATE_NOW,
          created_by: 'lily',
          id: '2',
        },
        {
          comment: 'Im a new comment',
        },
      ];
      const result = enrichExistingExceptionItemWithComments(payload, comments);
      const expected = {
        ...getExceptionListItemSchemaMock(),
        comments: [
          {
            comment: 'Im an existing comment',
            id: '1',
          },
          {
            comment: 'Im another existing comment',
            id: '2',
          },
          {
            comment: 'Im a new comment',
          },
        ],
      };
      expect(result).toEqual(expected);
    });
  });

  describe('#enrichNewExceptionItemsWithComments', () => {
    test('it should add comments to an exception item', () => {
      const payload = [getExceptionListItemSchemaMock()];
      const comments = getCommentsArrayMock();
      const result = enrichNewExceptionItemsWithComments(payload, comments);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          comments: getCommentsArrayMock(),
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it should add comments to multiple exception items', () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const comments = getCommentsArrayMock();
      const result = enrichNewExceptionItemsWithComments(payload, comments);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          comments: getCommentsArrayMock(),
        },
        {
          ...getExceptionListItemSchemaMock(),
          comments: getCommentsArrayMock(),
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('#enrichExceptionItemsWithOS', () => {
    test('it should add an os tag to an exception item', () => {
      const payload = [getExceptionListItemSchemaMock()];
      const osTypes = ['windows'];
      const result = enrichExceptionItemsWithOS(payload, osTypes);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          _tags: [...getExceptionListItemSchemaMock()._tags, 'os:windows'],
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it should add multiple os tags to all exception items', () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const osTypes = ['windows', 'macos'];
      const result = enrichExceptionItemsWithOS(payload, osTypes);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          _tags: [...getExceptionListItemSchemaMock()._tags, 'os:windows', 'os:macos'],
        },
        {
          ...getExceptionListItemSchemaMock(),
          _tags: [...getExceptionListItemSchemaMock()._tags, 'os:windows', 'os:macos'],
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it should add os tag to all exception items without duplication', () => {
      const payload = [
        { ...getExceptionListItemSchemaMock(), _tags: ['os:linux', 'os:windows'] },
        { ...getExceptionListItemSchemaMock(), _tags: ['os:linux'] },
      ];
      const osTypes = ['windows'];
      const result = enrichExceptionItemsWithOS(payload, osTypes);
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          _tags: ['os:linux', 'os:windows'],
        },
        {
          ...getExceptionListItemSchemaMock(),
          _tags: ['os:linux', 'os:windows'],
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('#entryHasListType', () => {
    test('it should return false with an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = entryHasListType(payload);
      expect(result).toEqual(false);
    });

    test("it should return false with exception items that don't contain a list type", () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const result = entryHasListType(payload);
      expect(result).toEqual(false);
    });

    test('it should return true with exception items that do contain a list type', () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ type: OperatorTypeEnum.LIST }] as EntriesArray,
        },
        getExceptionListItemSchemaMock(),
      ];
      const result = entryHasListType(payload);
      expect(result).toEqual(true);
    });
  });

  describe('#entryHasNonEcsType', () => {
    const mockEcsIndexPattern = {
      title: 'testIndex',
      fields: [
        {
          name: 'some.parentField',
        },
        {
          name: 'some.not.nested.field',
        },
        {
          name: 'nested.field',
        },
      ],
    } as IIndexPattern;

    test('it should return false with an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = entryHasNonEcsType(payload, mockEcsIndexPattern);
      expect(result).toEqual(false);
    });

    test("it should return false with exception items that don't contain a non ecs type", () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const result = entryHasNonEcsType(payload, mockEcsIndexPattern);
      expect(result).toEqual(false);
    });

    test('it should return true with exception items that do contain a non ecs type', () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'some.nonEcsField' }] as EntriesArray,
        },
        getExceptionListItemSchemaMock(),
      ];
      const result = entryHasNonEcsType(payload, mockEcsIndexPattern);
      expect(result).toEqual(true);
    });
  });

  describe('#prepareExceptionItemsForBulkClose', () => {
    test('it should return no exceptionw when passed in an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = prepareExceptionItemsForBulkClose(payload);
      expect(result).toEqual([]);
    });

    test("should not make any updates when the exception entries don't contain 'event.'", () => {
      const payload = [getExceptionListItemSchemaMock(), getExceptionListItemSchemaMock()];
      const result = prepareExceptionItemsForBulkClose(payload);
      expect(result).toEqual(payload);
    });

    test("should update entry fields when they start with 'event.'", () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'event.kind',
            },
            getEntryMatchMock(),
          ],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'event.module',
            },
          ],
        },
      ];
      const expected = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'signal.original_event.kind',
            },
            getEntryMatchMock(),
          ],
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            {
              ...getEntryMatchMock(),
              field: 'signal.original_event.module',
            },
          ],
        },
      ];
      const result = prepareExceptionItemsForBulkClose(payload);
      expect(result).toEqual(expected);
    });
  });

  describe('#lowercaseHashValues', () => {
    test('it should return an empty array with an empty array', () => {
      const payload: ExceptionListItemSchema[] = [];
      const result = lowercaseHashValues(payload);
      expect(result).toEqual([]);
    });

    test('it should return all list items with entry hashes lowercased', () => {
      const payload = [
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'DDDFFF' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'aaabbb' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            { field: 'user.hash', type: 'match_any', value: ['aaabbb', 'DDDFFF'] },
          ] as EntriesArray,
        },
      ];
      const result = lowercaseHashValues(payload);
      expect(result).toEqual([
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'dddfff' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [{ field: 'user.hash', type: 'match', value: 'aaabbb' }] as EntriesArray,
        },
        {
          ...getExceptionListItemSchemaMock(),
          entries: [
            { field: 'user.hash', type: 'match_any', value: ['aaabbb', 'dddfff'] },
          ] as EntriesArray,
        },
      ]);
    });
  });
});
