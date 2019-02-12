/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString } from 'lodash';

export class SavedObjectActions {
  public all = `saved_object:*`;

  public get(type: string, operation: string): string {
    if (!type || !isString(type)) {
      throw new Error('type is required and must be a string');
    }

    if (!operation || !isString(operation)) {
      throw new Error('operation is required and must be a string');
    }

    return `saved_object:${type}/${operation}`;
  }
}
