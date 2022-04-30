/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from 'src/core/public';

import type { Role, RoleIndexPrivilege } from '../../../common/model';
import { copyRole } from '../../../common/model';

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

  public async saveRole({ role }: { role: Role }) {
    await this.http.put(`/api/security/role/${encodeURIComponent(role.name)}`, {
      body: JSON.stringify(this.transformRoleForSave(copyRole(role))),
    });
  }

  private transformRoleForSave(role: Role) {
    // Remove any placeholder index privileges
    const isPlaceholderPrivilege = (indexPrivilege: RoleIndexPrivilege) =>
      indexPrivilege.names.length === 0;
    role.elasticsearch.indices = role.elasticsearch.indices.filter(
      (indexPrivilege) => !isPlaceholderPrivilege(indexPrivilege)
    );

    // Remove any placeholder query entries
    role.elasticsearch.indices.forEach((index) => index.query || delete index.query);

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
