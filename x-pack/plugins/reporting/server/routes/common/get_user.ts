/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SecurityServiceStart } from '@kbn/core/server';

export function getUser(request: KibanaRequest, securityService: SecurityServiceStart) {
  return securityService.authc.getCurrentUser(request) ?? false;
}
