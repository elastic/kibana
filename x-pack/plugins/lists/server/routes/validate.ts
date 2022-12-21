/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { exactCheck, formatErrors, validate } from '@kbn/securitysolution-io-ts-utils';
import {
  NamespaceType,
  NonEmptyEntriesArray,
  foundExceptionListItemSchema,
  nonEmptyEndpointEntriesArray,
} from '@kbn/securitysolution-io-ts-list-types';
import { MAX_EXCEPTION_LIST_SIZE } from '@kbn/securitysolution-list-constants';

import { ExceptionListClient } from '../services/exception_lists/exception_list_client';

export const validateExceptionListSize = async (
  exceptionLists: ExceptionListClient,
  listId: string,
  namespaceType: NamespaceType
): Promise<{ body: string; statusCode: number } | null> => {
  const exceptionListItems = await exceptionLists.findExceptionListItem({
    filter: undefined,
    listId,
    namespaceType,
    page: undefined,
    perPage: undefined,
    pit: undefined,
    searchAfter: undefined,
    sortField: undefined,
    sortOrder: undefined,
  });
  if (exceptionListItems == null) {
    // If exceptionListItems is null then we couldn't find the list so it may have been deleted
    return {
      body: `Unable to find list id: ${listId} to verify max exception list size`,
      statusCode: 500,
    };
  }
  const [validatedItems, err] = validate(exceptionListItems, foundExceptionListItemSchema);
  if (err != null) {
    return {
      body: err,
      statusCode: 500,
    };
  }
  // Unnecessary since validatedItems comes from exceptionListItems which is already
  // checked for null, but typescript fails to detect that
  if (validatedItems == null) {
    return {
      body: `Unable to find list id: ${listId} to verify max exception list size`,
      statusCode: 500,
    };
  }
  if (validatedItems.total > MAX_EXCEPTION_LIST_SIZE) {
    return {
      body: `Failed to add exception item, exception list would exceed max size of ${MAX_EXCEPTION_LIST_SIZE}`,
      statusCode: 400,
    };
  }
  return null;
};

export const validateEndpointExceptionItemEntries = (
  entries: NonEmptyEntriesArray
): { body: string[]; statusCode: number } | null =>
  pipe(
    nonEmptyEndpointEntriesArray.decode(entries),
    (decoded) => exactCheck(entries, decoded),
    fold(
      (errors: t.Errors) => {
        return {
          body: formatErrors(errors),
          statusCode: 400,
        };
      },
      () => null
    )
  );
