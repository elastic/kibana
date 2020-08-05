/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';

import { ListClient } from '../../services/lists/list_client';
import { ErrorWithStatusCode } from '../../error_with_status_code';

export const getListClient = (context: RequestHandlerContext): ListClient => {
  const lists = context.lists?.getListClient();
  if (lists == null) {
    throw new ErrorWithStatusCode('Lists is not found as a plugin', 404);
  } else {
    return lists;
  }
};
