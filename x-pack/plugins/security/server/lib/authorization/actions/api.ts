/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isString } from 'lodash';

const prefix = 'api:';

export class ApiActions {
  public all = `${prefix}*`;

  public get(operation: string) {
    if (!operation || !isString(operation)) {
      throw new Error('operation is required and must be a string');
    }

    return `${prefix}${operation}`;
  }
}
