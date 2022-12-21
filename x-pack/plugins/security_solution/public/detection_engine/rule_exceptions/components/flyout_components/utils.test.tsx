/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCreateExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';

import {
  enrichItemWithComment,
  enrichItemWithName,
  enrichEndpointItems,
  enrichItemsForDefaultRuleList,
  enrichItemsForSharedLists,
  enrichNewExceptionItems,
} from './utils';

const getExceptionItems = (): ExceptionsBuilderReturnExceptionItem[] => [
  { ...getCreateExceptionListItemSchemaMock(), os_types: [] },
];

describe('add_exception_flyout#utils', () => {
  describe('entrichNewExceptionItems', () => {
    it('enriches exception items for rule default list', () => {
      const items = getExceptionItems();

      expect(
        enrichNewExceptionItems({
          itemName: 'My item',
          commentToAdd: 'New comment',
          addToRules: true,
          addToSharedLists: false,
          sharedLists: [],
          selectedOs: [],
          listType: ExceptionListTypeEnum.RULE_DEFAULT,
          items,
        })
      ).toEqual([
        {
          ...items[0],
          comments: [{ comment: 'New comment' }],
          list_id: undefined,
          name: 'My item',
          namespace_type: 'single',
        },
      ]);
    });

    it('enriches exception items for shared lists', () => {
      const items = getExceptionItems();
      const sharedLists: ExceptionListSchema[] = [
        {
          ...getExceptionListSchemaMock(),
          list_id: 'foo',
          namespace_type: 'single',
        },
        {
          ...getExceptionListSchemaMock(),
          list_id: 'bar',
        },
      ];

      expect(
        enrichNewExceptionItems({
          itemName: 'My item',
          commentToAdd: 'New comment',
          addToRules: false,
          addToSharedLists: true,
          sharedLists,
          selectedOs: [],
          listType: ExceptionListTypeEnum.DETECTION,
          items,
        })
      ).toEqual([
        {
          ...items[0],
          comments: [{ comment: 'New comment' }],
          list_id: 'foo',
          name: 'My item',
          namespace_type: 'single',
        },
        {
          ...items[0],
          comments: [{ comment: 'New comment' }],
          list_id: 'bar',
          name: 'My item',
          namespace_type: 'agnostic',
        },
      ]);
    });

    it('enriches exception items for endpoint list', () => {
      const items: ExceptionsBuilderReturnExceptionItem[] = [
        {
          ...getCreateExceptionListItemSchemaMock(),
          list_id: 'endpoint_list',
          namespace_type: 'agnostic',
          os_types: [],
        },
      ];

      expect(
        enrichNewExceptionItems({
          itemName: 'My item',
          commentToAdd: 'New comment',
          addToRules: false,
          addToSharedLists: false,
          sharedLists: [],
          selectedOs: ['windows'],
          listType: ExceptionListTypeEnum.ENDPOINT,
          items,
        })
      ).toEqual([
        {
          ...items[0],
          comments: [{ comment: 'New comment' }],
          list_id: 'endpoint_list',
          name: 'My item',
          namespace_type: 'agnostic',
          os_types: ['windows'],
        },
      ]);
    });
  });

  describe('enrichItemWithComment', () => {
    it('returns items unchanged if no comment', () => {
      const items = getExceptionItems();

      expect(enrichItemWithComment('  ')(items)).toEqual(items);
    });

    it('returns items with new comment', () => {
      const items = getExceptionItems();

      expect(enrichItemWithComment('My new comment')(items)).toEqual([
        {
          ...items[0],
          comments: [
            {
              comment: 'My new comment',
            },
          ],
        },
      ]);
    });
  });

  describe('enrichItemWithName', () => {
    it('returns items unchanged if no name', () => {
      const items = getExceptionItems();

      expect(enrichItemWithName('  ')(items)).toEqual(items);
    });

    it('returns items with name', () => {
      const items = getExceptionItems();

      expect(enrichItemWithName('My item')(items)).toEqual([
        {
          ...items[0],
          name: 'My item',
        },
      ]);
    });
  });

  describe('enrichEndpointItems', () => {
    it('returns items unchanged if "listType" is not "endpoint"', () => {
      const items = getExceptionItems();

      expect(enrichEndpointItems(ExceptionListTypeEnum.DETECTION, [])(items)).toEqual(items);
    });

    it('returns items with os types', () => {
      const items: ExceptionsBuilderReturnExceptionItem[] = [
        {
          ...getCreateExceptionListItemSchemaMock(),
          namespace_type: 'agnostic',
          list_id: 'endpoint_list',
        },
      ];

      expect(enrichEndpointItems(ExceptionListTypeEnum.ENDPOINT, ['windows'])(items)).toEqual([
        {
          ...items[0],
          os_types: ['windows'],
        },
      ]);
    });
  });

  describe('enrichItemsForDefaultRuleList', () => {
    it('returns items unchanged if "addToRules" is "false"', () => {
      const items = getExceptionItems();

      expect(enrichItemsForDefaultRuleList(ExceptionListTypeEnum.DETECTION, false)(items)).toEqual(
        items
      );
    });

    /*
     * Wouldn't make sense for the second argument to be "true", when
     * listType is endpoint, but figured it'd be good
     * to test anyways.
     */
    it('returns items unchanged if "listType" is "endpoint"', () => {
      const items = getExceptionItems();

      expect(enrichItemsForDefaultRuleList(ExceptionListTypeEnum.ENDPOINT, true)(items)).toEqual(
        items
      );
    });

    it('returns items with to add for each shared list', () => {
      const items = getExceptionItems();

      expect(enrichItemsForDefaultRuleList(ExceptionListTypeEnum.DETECTION, true)(items)).toEqual([
        {
          ...items[0],
          list_id: undefined,
          namespace_type: 'single',
        },
      ]);
    });
  });

  describe('enrichItemsForSharedLists', () => {
    it('returns items unchanged if "addToSharedLists" is "false"', () => {
      const items = getExceptionItems();

      expect(enrichItemsForSharedLists(ExceptionListTypeEnum.DETECTION, false, [])(items)).toEqual(
        items
      );
    });

    /*
     * Wouldn't make sense for the second argument to be "true", when
     * listType is endpoint, but figured it'd be good
     * to test anyways.
     */
    it('returns items unchanged if "listType" is "endpoint"', () => {
      const items = getExceptionItems();

      expect(enrichItemsForSharedLists(ExceptionListTypeEnum.ENDPOINT, true, [])(items)).toEqual(
        items
      );
    });

    it('returns items with to add for each shared list', () => {
      const items = getExceptionItems();
      const sharedLists: ExceptionListSchema[] = [
        {
          ...getExceptionListSchemaMock(),
          list_id: 'foo',
          namespace_type: 'single',
        },
        {
          ...getExceptionListSchemaMock(),
          list_id: 'bar',
        },
      ];
      expect(
        enrichItemsForSharedLists(ExceptionListTypeEnum.DETECTION, true, sharedLists)(items)
      ).toEqual([
        {
          ...items[0],
          list_id: 'foo',
          namespace_type: 'single',
        },
        {
          ...items[0],
          list_id: 'bar',
          namespace_type: 'agnostic',
        },
      ]);
    });
  });
});
