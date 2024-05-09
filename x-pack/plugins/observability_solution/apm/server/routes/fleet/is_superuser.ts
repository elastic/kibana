/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { APMPluginStartDependencies } from '../../types';

export function isSuperuser({
  securityPluginStart,
  request,
}: {
  securityPluginStart: NonNullable<APMPluginStartDependencies['security']>;
  request: KibanaRequest;
}) {
  const user = securityPluginStart.authc.getCurrentUser(request);
  return user?.roles.includes('superuser');
}
