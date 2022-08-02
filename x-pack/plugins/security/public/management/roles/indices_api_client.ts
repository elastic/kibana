/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

export class IndicesAPIClient {
  private readonly fieldCache = new Map<string, string[]>();

  constructor(private readonly http: HttpStart) {}

  async getFields(pattern: string): Promise<string[]> {
    if (pattern && !this.fieldCache.has(pattern)) {
      const fields = await this.http.get<string[]>(
        `/internal/security/fields/${encodeURIComponent(pattern)}`
      );
      if (Array.isArray(fields) && fields.length > 0) {
        this.fieldCache.set(pattern, fields);
      }
    }

    return this.fieldCache.get(pattern) ?? [];
  }
}
