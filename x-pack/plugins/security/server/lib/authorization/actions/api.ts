/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class ApiActions {
  public all = `api:*`;

  public get(path: string, operation: string) {
    return `api:${path}/${operation}`;
  }
}
