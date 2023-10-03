/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateESDate } from '../../validators/validate_es_date';
import type { GetServicesOptions, GetServicesOptionsInjected } from './shared_types';

export type { GetServicesOptions, GetServicesOptionsInjected };
export { getServices } from './get_services';

export function validateGetServicesOptions(options: GetServicesOptions) {
  validateESDate(options.from);
  if (options.to) {
    validateESDate(options.to);
  }
}
