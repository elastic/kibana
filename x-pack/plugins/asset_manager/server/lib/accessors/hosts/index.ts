/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateESDate } from '../../validators/validate_es_date';
import type { GetHostsOptions, GetHostsOptionsInjected } from './shared_types';
export { getHosts } from './get_hosts';

export type { GetHostsOptions, GetHostsOptionsInjected };

export function validateGetHostsOptions(options: GetHostsOptions) {
  validateESDate(options.from);
  if (options.to) {
    validateESDate(options.to);
  }
}
