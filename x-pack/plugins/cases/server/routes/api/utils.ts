/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Boom, boomify, isBoom } from '@hapi/boom';

import { schema } from '@kbn/config-schema';
import { CustomHttpResponseOptions, ResponseError } from 'kibana/server';
import { CaseError, isCaseError, HTTPError, isHTTPError } from '../../common/error';

/**
 * Transforms an error into the correct format for a kibana response.
 */

export function wrapError(
  error: CaseError | Boom | HTTPError | Error
): CustomHttpResponseOptions<ResponseError> {
  let boom: Boom;

  if (isCaseError(error)) {
    boom = error.boomify();
  } else {
    const options = { statusCode: isHTTPError(error) ? error.statusCode : 500 };
    boom = isBoom(error) ? error : boomify(error, options);
  }

  return {
    body: boom,
    headers: boom.output.headers as { [key: string]: string },
    statusCode: boom.output.statusCode,
  };
}

export const escapeHatch = schema.object({}, { unknowns: 'allow' });
