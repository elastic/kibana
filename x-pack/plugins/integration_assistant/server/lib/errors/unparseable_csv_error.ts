/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from '@kbn/core/server';
import { ErrorThatHandlesItsOwnResponse } from './types';
import { GenerationErrorCode } from '../../../common/constants';
import {
  GenerationErrorAttributes,
  GenerationErrorBody,
} from '../../../common/api/generation_error';

const errorCode = GenerationErrorCode.UNPARSEABLE_CSV_DATA;

export interface CSVParseError {
  message: string[];
}

export class UnparseableCSVFormatError extends Error implements ErrorThatHandlesItsOwnResponse {
  attributes: GenerationErrorAttributes;

  constructor(csvParseErrors: CSVParseError[]) {
    super(errorCode);
    this.attributes = {
      errorCode,
      underlyingMessages: csvParseErrors.flatMap((error) => error.message),
    };
  }

  public sendResponse(res: KibanaResponseFactory) {
    const body: GenerationErrorBody = {
      message: errorCode,
      attributes: this.attributes,
    };
    return res.customError({
      statusCode: 422,
      body,
    });
  }
}
