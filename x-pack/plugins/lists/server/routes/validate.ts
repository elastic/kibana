/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExceptionListClient } from '../services/exception_lists/exception_list_client';
import { MAX_EXCEPTION_LIST_SIZE } from '../../common/constants';
import { foundExceptionListItemSchema } from '../../common/schemas';
import { NamespaceType } from '../../common/schemas/types';
import { validate } from '../../common/siem_common_deps';

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
