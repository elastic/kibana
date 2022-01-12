/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorWithStatusCode } from '../../../error_with_status_code';

export class DataValidationError extends ErrorWithStatusCode {
  constructor(public readonly reason: string[], statusCode: number = 500) {
    super('Data validation failure', statusCode);
  }

  public getReason(): string[] {
    return this.reason ?? [];
  }
}
