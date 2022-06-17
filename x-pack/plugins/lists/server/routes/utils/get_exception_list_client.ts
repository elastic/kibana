/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListsRequestHandlerContext } from '../../types';
import { ErrorWithStatusCode } from '../../error_with_status_code';
import { ExceptionListClient } from '../../services/exception_lists/exception_list_client';

export const getExceptionListClient = async (
  context: ListsRequestHandlerContext
): Promise<ExceptionListClient> => {
  const exceptionLists = (await context.lists)?.getExceptionListClient();
  if (exceptionLists == null) {
    throw new ErrorWithStatusCode('Exception lists is not found as a plugin', 404);
  } else {
    return exceptionLists;
  }
};
