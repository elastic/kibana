/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

import type { BuiltinESPrivileges, RawKibanaPrivileges } from '../../../common/model';

export class PrivilegesAPIClient {
  constructor(private readonly http: HttpStart) {}

  /*
   * respectLicenseLevel is an internal optional parameter soley for getting all sub-feature
   * privilieges to use in the UI. It is not meant for any other use.
   */
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
