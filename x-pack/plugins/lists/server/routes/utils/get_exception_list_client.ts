/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';

import { ErrorWithStatusCode } from '../../error_with_status_code';
import { ExceptionListClient } from '../../services/exception_lists/exception_list_client';

export const getExceptionListClient = (context: RequestHandlerContext): ExceptionListClient => {
  const exceptionLists = context.lists?.getExceptionListClient();
  if (exceptionLists == null) {
    throw new ErrorWithStatusCode('Exception lists is not found as a plugin', 404);
  } else {
    return exceptionLists;
  }
};
