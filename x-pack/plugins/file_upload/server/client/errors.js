/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify } from 'boom';

export function wrapError(error) {
  return boomify(error, { statusCode: error.status });
}
