/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount } from 'enzyme';

import {
  getOperatorType,
  getExceptionOperatorSelect,
  determineIfIsNested,
  getFormattedEntries,
  formatEntry,
  getOperatingSystems,
  getTagsInclude,
  getDescriptionListContent,
  getFormattedComments,
} from './helpers';
import {
  OperatorType,
  Operator,
  NestedExceptionEntry,
  ExceptionEntry,
  FormattedEntry,
  DescriptionListItem,
  ExceptionListItemSchema,
} from './types';
import {
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  isInListOperator,
  isNotInListOperator,
  existsOperator,
  doesNotExistOperator,
} from './operators';

const getExceptionItemMock = (): ExceptionListItemSchema => ({
  id: 'uuid_here',
  item_id: 'item-id',
  created_at: '2020-04-23T00:19:13.289Z',
  created_by: 'user_name',
  list_id: 'test-exception',
  tie_breaker_id: '77fd1909-6786-428a-a671-30229a719c1f',
  updated_at: '2020-04-23T00:19:13.289Z',
  updated_by: 'user_name',
  namespace_type: 'single',
  name: '',
  description: '',
  comments: [
    {
      user: 'user_name',
      timestamp: '2020-04-23T00:19:13.289Z',
      comment: 'Comment goes here',
    },
  ],
  _tags: ['os:windows'],
  tags: [],
  type: 'simple',
  entries: [
    {
      field: 'actingProcess.file.signer',
      type: 'match',
      operator: Operator.INCLUSION,
      value: 'Elastic, N.V.',
    },
    {
      field: 'host.name',
      type: 'match',
      operator: Operator.EXCLUSION,
      value: 'Global Signer',
    },
    {
      field: 'file.signature',
      type: 'nested',
      entries: [
        {
          field: 'signer',
          type: 'match',
          operator: Operator.INCLUSION,
          value: 'Evil',
        },
        {
          field: 'trusted',
          type: 'match',
          operator: Operator.INCLUSION,
          value: 'true',
        },
      ],
    },
  ],
});

const getExceptionItemEntryMock = (): ExceptionEntry => ({
  field: 'host.name',
  type: 'match',
  operator: Operator.INCLUSION,
  value: 'jibberjabber',
});

describe('Exception helpers', () => {
  describe('#getOperatorType', () => {
    test('returns operator type "match" if entry.type is "match"', () => {
      const payload = getExceptionItemEntryMock();
      payload.type = 'match';
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorType.PHRASE);
    });

    test('returns operator type "match" if entry.type is "nested"', () => {
      const payload = getExceptionItemEntryMock();
      payload.type = 'nested';
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorType.PHRASE);
    });

    test('returns operator type "match_any" if entry.type is "match_any"', () => {
      const payload = getExceptionItemEntryMock();
      payload.type = 'match_any';
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorType.PHRASES);
    });

    test('returns operator type "list" if entry.type is "list"', () => {
      const payload = getExceptionItemEntryMock();
      payload.type = 'list';
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorType.LIST);
    });

    test('returns operator type "exists" if entry.type is "exists"', () => {
      const payload = getExceptionItemEntryMock();
      payload.type = 'exists';
      const operatorType = getOperatorType(payload);

      expect(operatorType).toEqual(OperatorType.EXISTS);
    });
  });

  describe('#getExceptionOperatorSelect', () => {
    test('it returns "isOperator" when "operator" is "included" and operator type is "match"', () => {
      const payload = getExceptionItemEntryMock();
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isOperator);
    });

    test('it returns "isNotOperator" when "operator" is "excluded" and operator type is "match"', () => {
      const payload = getExceptionItemEntryMock();
      payload.operator = Operator.EXCLUSION;
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isNotOperator);
    });

    test('it returns "isOneOfOperator" when "operator" is "included" and operator type is "match_any"', () => {
      const payload = getExceptionItemEntryMock();
      payload.type = 'match_any';
      payload.operator = Operator.INCLUSION;
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isOneOfOperator);
    });

    test('it returns "isNotOneOfOperator" when "operator" is "excluded" and operator type is "match_any"', () => {
      const payload = getExceptionItemEntryMock();
      payload.type = 'match_any';
      payload.operator = Operator.EXCLUSION;
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isNotOneOfOperator);
    });

    test('it returns "existsOperator" when "operator" is "included" and no operator type is provided', () => {
      const payload = getExceptionItemEntryMock();
      payload.type = 'exists';
      payload.operator = Operator.INCLUSION;
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(existsOperator);
    });

    test('it returns "doesNotExistsOperator" when "operator" is "excluded" and no operator type is provided', () => {
      const payload = getExceptionItemEntryMock();
      payload.type = 'exists';
      payload.operator = Operator.EXCLUSION;
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(doesNotExistOperator);
    });

    test('it returns "isInList" when "operator" is "included" and operator type is "list"', () => {
      const payload = getExceptionItemEntryMock();
      payload.type = 'list';
      payload.operator = Operator.INCLUSION;
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isInListOperator);
    });

    test('it returns "isNotInList" when "operator" is "excluded" and operator type is "list"', () => {
      const payload = getExceptionItemEntryMock();
      payload.type = 'list';
      payload.operator = Operator.EXCLUSION;
      const result = getExceptionOperatorSelect(payload);

      expect(result).toEqual(isNotInListOperator);
    });
  });

  describe('#determineIfIsNested', () => {
    test('it returns true if type NestedExceptionEntry', () => {
      const payload: NestedExceptionEntry = {
        field: 'host.name',
        type: 'nested',
        entries: [],
      };
      const result = determineIfIsNested(payload);

      expect(result).toBeTruthy();
    });

    test('it returns false if NOT type NestedExceptionEntry', () => {
      const payload = getExceptionItemEntryMock();
      const result = determineIfIsNested(payload);

      expect(result).toBeFalsy();
    });
  });

  describe('#getFormattedEntries', () => {
    test('it returns empty array if no entries passed', () => {
      const result = getFormattedEntries([]);

      expect(result).toEqual([]);
    });

    test('it formats nested entries as expected', () => {
      const payload = [
        {
          field: 'file.signature',
          type: 'nested',
          entries: [
            {
              field: 'signer',
              type: 'match',
              operator: Operator.INCLUSION,
              value: 'Evil',
            },
            {
              field: 'trusted',
              type: 'match',
              operator: Operator.INCLUSION,
              value: 'true',
            },
          ],
        },
      ];
      const result = getFormattedEntries(payload);
      const expected: FormattedEntry[] = [
        {
          fieldName: 'file.signature',
          operator: null,
          value: null,
          isNested: false,
        },
        {
          fieldName: 'file.signature.signer',
          isNested: true,
          operator: 'is',
          value: 'Evil',
        },
        {
          fieldName: 'file.signature.trusted',
          isNested: true,
          operator: 'is',
          value: 'true',
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it formats non-nested entries as expected', () => {
      const payload = [
        {
          field: 'actingProcess.file.signer',
          type: 'match',
          operator: Operator.INCLUSION,
          value: 'Elastic, N.V.',
        },
        {
          field: 'host.name',
          type: 'match',
          operator: Operator.EXCLUSION,
          value: 'Global Signer',
        },
      ];
      const result = getFormattedEntries(payload);
      const expected: FormattedEntry[] = [
        {
          fieldName: 'actingProcess.file.signer',
          isNested: false,
          operator: 'is',
          value: 'Elastic, N.V.',
        },
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is not',
          value: 'Global Signer',
        },
      ];
      expect(result).toEqual(expected);
    });

    test('it formats a mix of nested and non-nested entries as expected', () => {
      const payload = getExceptionItemMock();
      const result = getFormattedEntries(payload.entries);
      const expected: FormattedEntry[] = [
        {
          fieldName: 'actingProcess.file.signer',
          isNested: false,
          operator: 'is',
          value: 'Elastic, N.V.',
        },
        {
          fieldName: 'host.name',
          isNested: false,
          operator: 'is not',
          value: 'Global Signer',
        },
        {
          fieldName: 'file.signature',
          isNested: false,
          operator: null,
          value: null,
        },
        {
          fieldName: 'file.signature.signer',
          isNested: true,
          operator: 'is',
          value: 'Evil',
        },
        {
          fieldName: 'file.signature.trusted',
          isNested: true,
          operator: 'is',
          value: 'true',
        },
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('#formatEntry', () => {
    test('it formats an entry', () => {
      const payload = getExceptionItemEntryMock();
      const formattedEntry = formatEntry({ isNested: false, item: payload });
      const expected: FormattedEntry = {
        fieldName: 'host.name',
        isNested: false,
        operator: 'is',
        value: 'jibberjabber',
      };

      expect(formattedEntry).toEqual(expected);
    });

    test('it formats a nested entry', () => {
      const payload = getExceptionItemEntryMock();
      const formattedEntry = formatEntry({ isNested: true, parent: 'parent', item: payload });
      const expected: FormattedEntry = {
        fieldName: 'parent.host.name',
        isNested: true,
        operator: 'is',
        value: 'jibberjabber',
      };

      expect(formattedEntry).toEqual(expected);
    });
  });

  describe('#getOperatingSystems', () => {
    test('it returns null if no operating system tag specified', () => {
      const result = getOperatingSystems(['some tag', 'some other tag']);

      expect(result).toBeNull();
    });

    test('it returns null if operating system tag malformed', () => {
      const result = getOperatingSystems(['some tag', 'jibberos:mac,windows', 'some other tag']);

      expect(result).toBeNull();
    });

    test('it returns formatted operating systems if specified in tags', () => {
      const result = getOperatingSystems(['some tag', 'os:mac,windows', 'some other tag']);

      expect(result).toEqual('Mac, Windows');
    });

    test('it returns formatted operating systems if space included in os tag', () => {
      const result = getOperatingSystems(['some tag', 'os: mac, windows', 'some other tag']);

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
      const payload = getExceptionItemMock();
      const result = getDescriptionListContent(payload);
      const expected: DescriptionListItem[] = [
        {
          description: 'Windows',
          title: 'OS',
        },
        {
          description: 'April 22nd 2020 @ 20:19:13',
          title: 'Date Created',
        },
        {
          description: 'user_name',
          title: 'Created by',
        },
      ];

      expect(result).toEqual(expected);
    });

    test('it returns formatted description list with a description if one specified', () => {
      const payload = getExceptionItemMock();
      payload._tags = [];
      payload.description = 'Im a description';
      const result = getDescriptionListContent(payload);
      const expected: DescriptionListItem[] = [
        {
          description: 'April 22nd 2020 @ 20:19:13',
          title: 'Date Created',
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
      const payload = getExceptionItemMock();
      payload._tags = [];
      payload.description = '';
      const result = getDescriptionListContent(payload);
      const expected: DescriptionListItem[] = [
        {
          description: 'April 22nd 2020 @ 20:19:13',
          title: 'Date Created',
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
      const payload = getExceptionItemMock().comments;
      const result = getFormattedComments(payload);

      expect(result[0].username).toEqual('user_name');
      expect(result[0].timestamp).toEqual('on Apr 22nd 2020 @ 20:19:13');
    });

    test('it returns formatted timeline icon with comment users initial', () => {
      const payload = getExceptionItemMock().comments;
      const result = getFormattedComments(payload);

      const wrapper = mount<React.ReactElement>(result[0].timelineIcon as React.ReactElement);

      expect(wrapper.text()).toEqual('U');
    });

    test('it returns comment text', () => {
      const payload = getExceptionItemMock().comments;
      const result = getFormattedComments(payload);

      const wrapper = mount<React.ReactElement>(result[0].children as React.ReactElement);

      expect(wrapper.text()).toEqual('Comment goes here');
    });
  });
});
