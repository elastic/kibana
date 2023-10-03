/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import { AssetsValidationError } from './validation_error';

export function validateESDate(dateString: string) {
  try {
    datemath.parse(dateString);
  } catch (error: any) {
    throw new AssetsValidationError(`"${dateString}" is not a valid Elasticsearch date value`);
  }
}
