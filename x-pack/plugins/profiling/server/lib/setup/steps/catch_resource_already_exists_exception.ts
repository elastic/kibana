/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isResponseError } from '@kbn/es-errors';

export function catchResourceAlreadyExistsException(error: any) {
  if (isResponseError(error) && error.body?.error?.type === 'resource_already_exists_exception') {
    return Promise.resolve();
  }

  return Promise.reject(error);
}
