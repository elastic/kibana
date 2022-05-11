/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

import type { RoleMapping } from '../../../common/model';

interface CheckRoleMappingFeaturesResponse {
  canManageRoleMappings: boolean;
  canUseInlineScripts: boolean;
  canUseStoredScripts: boolean;
  hasCompatibleRealms: boolean;
}

type DeleteRoleMappingsResponse = Array<{
  name: string;
  success: boolean;
  error?: Error;
}>;

export class RoleMappingsAPIClient {
  constructor(private readonly http: HttpStart) {}

  public async checkRoleMappingFeatures(): Promise<CheckRoleMappingFeaturesResponse> {
    return this.http.get(`/internal/security/_check_role_mapping_features`);
  }

  public async getRoleMappings(): Promise<RoleMapping[]> {
    return this.http.get(`/internal/security/role_mapping`);
  }

  public async getRoleMapping(name: string): Promise<RoleMapping> {
    return this.http.get(`/internal/security/role_mapping/${encodeURIComponent(name)}`);
  }

  public async saveRoleMapping(roleMapping: RoleMapping) {
    const { name, ...payload } = roleMapping;

    return this.http.post(`/internal/security/role_mapping/${encodeURIComponent(name)}`, {
      body: JSON.stringify(payload),
    });
  }

  public async deleteRoleMappings(names: string[]): Promise<DeleteRoleMappingsResponse> {
    return Promise.all(
      names.map((name) =>
        this.http
          .delete(`/internal/security/role_mapping/${encodeURIComponent(name)}`)
          .then(() => ({ success: true, name }))
          .catch((error) => ({ success: false, name, error }))
      )
    );
  }
}
