/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kibanaResponseFactory } from '../../../../../../../src/core/server';
// @ts-ignore
import { wrapEsError } from '../lib/error_wrappers';
import { isEsError } from '../lib/is_es_error';

export const mapErrorToKibanaHttpResponse = (err: any) => {
  if (isEsError(err)) {
    const { statusCode, message, body } = wrapEsError(err);
    return kibanaResponseFactory.customError({
      statusCode,
      body: {
        message,
        attributes: {
          cause: body?.cause,
        },
      },
    });
  }
  return kibanaResponseFactory.internalError(err);
};
