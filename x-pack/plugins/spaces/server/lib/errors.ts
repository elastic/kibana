/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { boomify } from 'boom';

export function wrapError(error: any) {
  if (error.isBoom) {
    return error;
  }

  return boomify(error, { statusCode: error.status });
}
