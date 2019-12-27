/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { RoleMapping } from '../../common/model';

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

export class RoleMappingsAPI {
  constructor(private readonly http: CoreSetup['http']) {}

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
    const payload = { ...roleMapping };
    delete payload.name;

    return this.http.post(
      `/internal/security/role_mapping/${encodeURIComponent(roleMapping.name)}`,
      { body: JSON.stringify(payload) }
    );
  }

  public async deleteRoleMappings(names: string[]): Promise<DeleteRoleMappingsResponse> {
    return Promise.all(
      names.map(name =>
        this.http
          .delete(`/internal/security/role_mapping/${encodeURIComponent(name)}`)
          .then(() => ({ success: true, name }))
          .catch(error => ({ success: false, name, error }))
      )
    );
  }
}
