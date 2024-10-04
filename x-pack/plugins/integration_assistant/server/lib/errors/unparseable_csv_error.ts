/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from '@kbn/core/server';
import { ErrorThatHandlesItsOwnResponse } from './types';
import { ErrorCode } from '../../../common/constants';

const errorCode = ErrorCode.UNPARSEABLE_CSV_DATA;

export interface CSVParseError {
  message: string[];
}

export class UnparseableCSVFormatError extends Error implements ErrorThatHandlesItsOwnResponse {
  errorMessages: string[];

  constructor(public readonly csvParseErrors: CSVParseError[]) {
    super(errorCode);
    this.errorMessages = csvParseErrors
      .flatMap((error) => error.message)
      .map((message) => message.replace(/{%.*?%}/g, '').trim());
  }

  public sendResponse(res: KibanaResponseFactory) {
    return res.customError({
      statusCode: 422,
      body: { message: this.message, attributes: { errorCode, errorMessages: this.errorMessages } },
    });
  }
}
