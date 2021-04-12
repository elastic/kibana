/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

export class SavedObjectActions {
  private readonly prefix: string;

  constructor(versionNumber: string) {
    this.prefix = `saved_object:${versionNumber}:`;
  }

  public get(type: string, operation: string): string {
    if (!type || !isString(type)) {
      throw new Error('type is required and must be a string');
    }

    if (!operation || !isString(operation)) {
      throw new Error('operation is required and must be a string');
    }

    return `${this.prefix}${type}/${operation}`;
  }
}
