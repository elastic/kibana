/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify, isBoom } from 'boom';
import { ResponseError, CustomHttpResponseOptions } from 'kibana/server';

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
    headers: boom.output.headers,
    statusCode,
  };
}
