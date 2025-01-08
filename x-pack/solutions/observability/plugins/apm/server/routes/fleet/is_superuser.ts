/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';

export function isSuperuser({
  coreStart,
  request,
}: {
  coreStart: CoreStart;
  request: KibanaRequest;
}) {
  const user = coreStart.security.authc.getCurrentUser(request);
  return user?.roles.includes('superuser');
}
