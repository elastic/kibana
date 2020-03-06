/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type ActionTypeDisabledReason =
  | 'config'
  | 'license_unavailable'
  | 'license_invalid'
  | 'license_expired';

export class ActionTypeDisabledError extends Error {
  public readonly reason: ActionTypeDisabledReason;

  constructor(message: string, reason: ActionTypeDisabledReason) {
    super(message);
    this.reason = reason;
  }
}
