/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS } from '@kbn/evals-common';
import type { CustomRoleScopedSupertestProvider } from '../../../services/custom_role_scoped_supertest';
import type { RoleScopedSupertestProvider } from '../../../services/role_scoped_supertest';
import type { SupertestWithRoleScopeType } from '../../../services';

export type EvalsSupertestClient = SupertestWithRoleScopeType;

const evalsRequestHeaders = {
  useCookieHeader: true,
  withInternalHeaders: true,
  withCustomHeaders: { 'elastic-api-version': API_VERSIONS.internal.v1 },
};

export async function getEvalsApiClientForRole(
  roleScopedSupertest: ReturnType<typeof RoleScopedSupertestProvider>,
  role: 'admin' | 'viewer'
): Promise<EvalsSupertestClient> {
  return roleScopedSupertest.getSupertestWithRoleScope(role, evalsRequestHeaders);
}

/** Requires `samlAuth.setCustomRole` to have defined the privileges first. */
export async function getEvalsApiClientForCustomRole(
  customRoleScopedSupertest: ReturnType<typeof CustomRoleScopedSupertestProvider>
): Promise<EvalsSupertestClient> {
  return customRoleScopedSupertest.getSupertestWithCustomRoleScope(evalsRequestHeaders);
}
