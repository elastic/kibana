/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS } from '@kbn/evals-common';
import type { RoleScopedSupertestProvider } from '../../../services/role_scoped_supertest';
import type { SupertestWithRoleScopeType } from '../../../services';

export type EvalsSupertestClient = SupertestWithRoleScopeType;

export async function getEvalsApiClientForRole(
  roleScopedSupertest: ReturnType<typeof RoleScopedSupertestProvider>,
  role: 'admin' | 'viewer'
): Promise<EvalsSupertestClient> {
  return roleScopedSupertest.getSupertestWithRoleScope(role, {
    useCookieHeader: true,
    withInternalHeaders: true,
    withCustomHeaders: { 'elastic-api-version': API_VERSIONS.internal.v1 },
  });
}
