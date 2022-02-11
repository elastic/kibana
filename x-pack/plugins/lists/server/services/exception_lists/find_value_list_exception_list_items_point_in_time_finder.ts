/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import type {
  FoundExceptionListItemSchema,
  Id,
  MaxSizeOrUndefined,
  PerPageOrUndefined,
  SortFieldOrUndefined,
  SortOrderOrUndefined,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  exceptionListAgnosticSavedObjectType,
  exceptionListSavedObjectType,
} from '@kbn/securitysolution-list-utils';

import { escapeQuotes } from '../utils/escape_query';
import { ExceptionListSoSchema } from '../../schemas/saved_objects';

import { transformSavedObjectsToFoundExceptionListItem } from './utils';

interface FindValueListExceptionListsItemsPointInTimeFinder {
  valueListId: Id;
  savedObjectsClient: SavedObjectsClientContract;
  perPage: PerPageOrUndefined;
  sortField: SortFieldOrUndefined;
  sortOrder: SortOrderOrUndefined;
  executeFunctionOnStream: (response: FoundExceptionListItemSchema) => void;
  maxSize: MaxSizeOrUndefined;
}

export const findValueListExceptionListItemsPointInTimeFinder = async ({
  valueListId,
  executeFunctionOnStream,
  savedObjectsClient,
  perPage,
  maxSize,
  sortField,
  sortOrder,
}: FindValueListExceptionListsItemsPointInTimeFinder): Promise<void> => {
  const escapedValueListId = escapeQuotes(valueListId);
  const finder = savedObjectsClient.createPointInTimeFinder<ExceptionListSoSchema, never>({
    filter: `(exception-list.attributes.list_type: item AND exception-list.attributes.entries.list.id:"${escapedValueListId}") OR (exception-list-agnostic.attributes.list_type: item AND exception-list-agnostic.attributes.entries.list.id:"${escapedValueListId}") `,
    perPage,
    sortField,
    sortOrder,
    type: [exceptionListSavedObjectType, exceptionListAgnosticSavedObjectType],
  });
  let count = 0;
  for await (const savedObjectsFindResponse of finder.find()) {
    count += savedObjectsFindResponse.saved_objects.length;
    const exceptionList = transformSavedObjectsToFoundExceptionListItem({
      savedObjectsFindResponse,
    });
    if (maxSize != null && count > maxSize) {
      const diff = count - maxSize;
      exceptionList.data = exceptionList.data.slice(-exceptionList.data.length, -diff);
      executeFunctionOnStream(exceptionList);
      try {
        finder.close();
      } catch (exception) {
        // This is just a pre-caution in case the finder does a throw we don't want to blow up
        // the response. We have seen this within e2e test containers but nothing happen in normal
        // operational conditions which is why this try/catch is here.
      }
      // early return since we are at our maxSize
      return;
    }
    executeFunctionOnStream(exceptionList);
  }

  try {
    finder.close();
  } catch (exception) {
    // This is just a pre-caution in case the finder does a throw we don't want to blow up
    // the response. We have seen this within e2e test containers but nothing happen in normal
    // operational conditions which is why this try/catch is here.
  }
};
