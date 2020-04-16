/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';

import { ListsClient } from '../../client';

class ErrorWithStatusCode extends Error {
  private readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }

  public getStatusCode = (): number => this.statusCode;
}

export const getListClient = (context: RequestHandlerContext): ListsClient => {
  const lists = context.lists?.getListsClient();
  if (lists == null) {
    throw new ErrorWithStatusCode('Lists is not found as a plugin', 404);
  } else {
    return lists;
  }
};
