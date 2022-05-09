/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomHttpResponseOptions, ResponseError } from '@kbn/core/server';
import { boomify, isBoom } from '@hapi/boom';

export function wrapError(error: any): CustomHttpResponseOptions<ResponseError> {
  const boom = isBoom(error)
    ? error
    : boomify(error, { statusCode: error.status ?? error.statusCode });
  const statusCode = boom.output.statusCode;
  return {
    body: {
      message: boom,
      ...(statusCode !== 500 && error.body ? { attributes: { body: error.body } } : {}),
    },
    headers: boom.output.headers as { [key: string]: string },
    statusCode,
  };
}
