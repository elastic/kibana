/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'src/core/public';
import { Role, RoleIndexPrivilege, copyRole } from '../../../common/model';
import { isGlobalPrivilegeDefinition } from './edit_role/privilege_utils';

export class RolesAPIClient {
  constructor(private readonly http: HttpStart) {}

  public async getRoles() {
    return await this.http.get<Role[]>('/api/security/role');
  }

  public async getRole(roleName: string) {
    return await this.http.get<Role>(`/api/security/role/${encodeURIComponent(roleName)}`);
  }

  public async deleteRole(roleName: string) {
    await this.http.delete(`/api/security/role/${encodeURIComponent(roleName)}`);
  }

  public async saveRole({ role, spacesEnabled }: { role: Role; spacesEnabled: boolean }) {
    await this.http.put(`/api/security/role/${encodeURIComponent(role.name)}`, {
      body: JSON.stringify(this.transformRoleForSave(copyRole(role), spacesEnabled)),
    });
  }

  private transformRoleForSave(role: Role, spacesEnabled: boolean) {
    // Remove any placeholder index privileges
    const isPlaceholderPrivilege = (indexPrivilege: RoleIndexPrivilege) =>
      indexPrivilege.names.length === 0;
    role.elasticsearch.indices = role.elasticsearch.indices.filter(
      (indexPrivilege) => !isPlaceholderPrivilege(indexPrivilege)
    );

    // Remove any placeholder query entries
    role.elasticsearch.indices.forEach((index) => index.query || delete index.query);

    // If spaces are disabled, then do not persist any space privileges
    if (!spacesEnabled) {
      role.kibana = role.kibana.filter(isGlobalPrivilegeDefinition);
    }

    role.kibana.forEach((kibanaPrivilege) => {
      // If a base privilege is defined, then do not persist feature privileges
      if (kibanaPrivilege.base.length > 0) {
        kibanaPrivilege.feature = {};
      }
    });

    // @ts-expect-error
    delete role.name;
    delete role.transient_metadata;
    delete role._unrecognized_applications;
    delete role._transform_error;

    return role;
  }
}
