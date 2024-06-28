/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityRequestHandlerContext } from '@kbn/core-security-server';

export function isSuperuser({
  securityService,
}: {
  securityService: SecurityRequestHandlerContext;
}) {
  const user = securityService.authc.getCurrentUser();
  return user?.roles.includes('superuser');
}
