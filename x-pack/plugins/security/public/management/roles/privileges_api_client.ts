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

  async getAll({ includeActions }: { includeActions: boolean }) {
    return await this.http.get<RawKibanaPrivileges>('/api/security/privileges', {
      query: { includeActions },
    });
  }

  async getBuiltIn() {
    return await this.http.get<BuiltinESPrivileges>('/internal/security/esPrivileges/builtin');
  }
}
