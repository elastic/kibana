/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMError } from '../../../typings/es_schemas/ui/apm_error';

export function getErrorName({ error }: APMError) {
  return error.log?.message || error.exception?.[0]?.message;
}
