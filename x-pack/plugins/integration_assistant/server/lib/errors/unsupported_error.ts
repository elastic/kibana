/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from '@kbn/core/server';
import { ErrorThatHandlesItsOwnResponse } from './types';
import { GenerationErrorCode } from '../../../common/constants';

export class UnsupportedLogFormatError extends Error implements ErrorThatHandlesItsOwnResponse {
  private readonly errorCode: string = GenerationErrorCode.UNSUPPORTED_LOG_SAMPLES_FORMAT;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(message: string) {
    super(message);
  }

  public sendResponse(res: KibanaResponseFactory) {
    return res.customError({
      statusCode: 501,
      body: { message: this.message, attributes: { errorCode: this.errorCode } },
    });
  }
}
