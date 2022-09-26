/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionListSchema, OsType } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';
import { pipe } from 'lodash/fp';

import {
  enrichExceptionItemsWithOS,
  enrichNewExceptionItemsWithComments,
  enrichNewExceptionItemsWithName,
  enrichRuleExceptions,
  enrichSharedExceptions,
  lowercaseHashValues,
} from '../../utils/helpers';

/**
 * Adds user defined name to all new exceptionItems
 * @param commentToAdd new comment to add to item
 */
export const enrichItemWithComment =
  (commentToAdd: string) =>
  (items: ExceptionsBuilderReturnExceptionItem[]): ExceptionsBuilderReturnExceptionItem[] => {
    return commentToAdd.trim() !== ''
      ? enrichNewExceptionItemsWithComments(items, [{ comment: commentToAdd }])
      : items;
  };

/**
 * Adds user defined name to all new exceptionItems
 * @param itemName exception item name
 */
export const enrichItemWithName =
  (itemName: string) => (items: ExceptionsBuilderReturnExceptionItem[]) => {
    return itemName.trim() !== '' ? enrichNewExceptionItemsWithName(items, itemName) : items;
  };

/**
 * Modifies item entries to be in correct format and adds os selection to items
 * @param listType exception list type
 * @param selectedOs os selection
 */
export const enrichEndpointItems =
  (listType: ExceptionListTypeEnum, selectedOs: OsType[]) =>
  (items: ExceptionsBuilderReturnExceptionItem[]) => {
    if (listType === ExceptionListTypeEnum.ENDPOINT) {
      return lowercaseHashValues(enrichExceptionItemsWithOS(items, selectedOs));
    } else {
      return items;
    }
  };

/**
 * Modifies exception items to prepare for creating as rule_default
 * list items
 * @param listType exception list type
 * @param addToRules boolean determining if user selected to add items to default rule list
 */
export const enrichItemsForDefaultRuleList =
  (listType: ExceptionListTypeEnum, addToRules: boolean) =>
  (items: ExceptionsBuilderReturnExceptionItem[]) => {
    if (addToRules && listType !== ExceptionListTypeEnum.ENDPOINT) {
      return enrichRuleExceptions(items);
    } else {
      return items;
    }
  };

/**
 * Prepares items to be added to shared exception lists
 * @param listType exception list type
 * @param addToSharedLists boolean determining if user selected to add items to shared list
 * @param lists shared exception lists that were selected to add items to
 */
export const enrichItemsForSharedLists =
  (listType: ExceptionListTypeEnum, addToSharedLists: boolean, lists: ExceptionListSchema[]) =>
  (items: ExceptionsBuilderReturnExceptionItem[]) => {
    if (addToSharedLists && listType !== ExceptionListTypeEnum.ENDPOINT) {
      return enrichSharedExceptions(items, lists);
    } else {
      return items;
    }
  };

/**
 * Series of utils to modify and prepare exception items for update or creation
 * @param itemName user defined exception item name
 * @param commentToAdd comment to be added to item
 * @param addToRules boolean determining if user selected to add items to default rule list
 * @param addToSharedLists boolean determining if user selected to add items to shared list
 * @param sharedLists shared exception lists that were selected to add items to
 * @param selectedOs os selection
 * @param listType exception list type
 * @param items exception items to be modified
 */
export const entrichNewExceptionItems = ({
  itemName,
  commentToAdd,
  addToRules,
  addToSharedLists,
  sharedLists,
  selectedOs,
  listType,
  items,
}: {
  itemName: string;
  commentToAdd: string;
  selectedOs: OsType[];
  addToRules: boolean;
  addToSharedLists: boolean;
  sharedLists: ExceptionListSchema[];
  listType: ExceptionListTypeEnum;
  items: ExceptionsBuilderReturnExceptionItem[];
}): ExceptionsBuilderReturnExceptionItem[] => {
  const enriched: ExceptionsBuilderReturnExceptionItem[] = pipe(
    enrichItemWithComment(commentToAdd),
    enrichItemWithName(itemName),
    enrichEndpointItems(listType, selectedOs),
    enrichItemsForDefaultRuleList(listType, addToRules),
    enrichItemsForSharedLists(listType, addToSharedLists, sharedLists)
  )(items);

  return enriched;
};

/**
 * Series of utils to modify and prepare exception items for update or creation
 * @param itemName user defined exception item name
 * @param commentToAdd comment to be added to item
 * @param addToRules boolean determining if user selected to add items to default rule list
 * @param addToSharedLists boolean determining if user selected to add items to shared list
 * @param sharedLists shared exception lists that were selected to add items to
 * @param selectedOs os selection
 * @param listType exception list type
 * @param items exception items to be modified
 */
export const entrichExceptionItemsForUpdate = ({
  itemName,
  commentToAdd,
  selectedOs,
  listType,
  items,
}: {
  itemName: string;
  commentToAdd: string;
  selectedOs: OsType[];
  listType: ExceptionListTypeEnum;
  items: ExceptionsBuilderReturnExceptionItem[];
}): ExceptionsBuilderReturnExceptionItem[] => {
  const enriched: ExceptionsBuilderReturnExceptionItem[] = pipe(
    enrichItemWithComment(commentToAdd),
    enrichItemWithName(itemName),
    enrichEndpointItems(listType, selectedOs)
  )(items);

  return enriched;
};
