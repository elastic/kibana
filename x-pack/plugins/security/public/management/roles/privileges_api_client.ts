/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { RawKibanaPrivileges } from '@kbn/security-authorization-core';
import { PrivilegesAPIClientPublicContract } from '@kbn/security-plugin-types-public';

import type { BuiltinESPrivileges } from '../../../common/model';

export class PrivilegesAPIClient extends PrivilegesAPIClientPublicContract {
  constructor(private readonly http: HttpStart) {
    super();
  }

  async getAll({
    includeActions,
    respectLicenseLevel = true,
  }: {
    includeActions: boolean;
    respectLicenseLevel: boolean;
  }) {
    return await this.http.get<RawKibanaPrivileges>('/api/security/privileges', {
      query: { includeActions, respectLicenseLevel },
    });
  }

  async getBuiltIn() {
    return await this.http.get<BuiltinESPrivileges>('/internal/security/esPrivileges/builtin');
  }
}
