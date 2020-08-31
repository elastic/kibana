/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString } from 'lodash';

export class AlertingActions {
  private readonly prefix: string;

  constructor(versionNumber: string) {
    this.prefix = `alerting:${versionNumber}:`;
  }

  public get(alertTypeId: string, consumer: string, operation: string): string {
    if (!alertTypeId || !isString(alertTypeId)) {
      throw new Error('alertTypeId is required and must be a string');
    }

    if (!operation || !isString(operation)) {
      throw new Error('operation is required and must be a string');
    }

    if (!consumer || !isString(consumer)) {
      throw new Error('consumer is required and must be a string');
    }

    return `${this.prefix}${alertTypeId}/${consumer}/${operation}`;
  }
}
