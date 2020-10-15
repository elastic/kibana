/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'src/core/public';

export class IndicesAPIClient {
  constructor(private readonly http: HttpStart) {}

  async getFields(query: string) {
    return (
      (await this.http.get<string[]>(`/internal/security/fields/${encodeURIComponent(query)}`)) ||
      []
    );
  }
}
