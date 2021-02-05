/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

export class ApiActions {
  private readonly prefix: string;

  constructor(versionNumber: string) {
    this.prefix = `api:${versionNumber}:`;
  }

  public get(operation: string) {
    if (!operation || !isString(operation)) {
      throw new Error('operation is required and must be a string');
    }

    return `${this.prefix}${operation}`;
  }
}
