/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from '@kbn/core/server';
import { ErrorCode, ErrorThatHandlesItsOwnResponse } from './types';

const RECURSION_LIMIT_ERROR = 'Recursion limit reached.';

export class RecursionLimitError extends Error implements ErrorThatHandlesItsOwnResponse {
  private readonly errorCode: ErrorCode = ErrorCode.RECURSION_LIMIT;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(message: string) {
    super(message);
  }

  public sendResponse(res: KibanaResponseFactory) {
    return res.badRequest({
      body: { message: RECURSION_LIMIT_ERROR, attributes: { errorCode: this.errorCode } },
    });
  }
}
