/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { assertNever } from '../../../../../../src/core/utils';
import { KibanaResponseFactory } from '../../../../../../src/core/server';

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

  public sendResponse(res: KibanaResponseFactory) {
    switch (this.reason) {
      case 'config':
        return res.badRequest({ body: { message: this.message } });
      case 'license_unavailable':
      case 'license_invalid':
      case 'license_expired':
        return res.forbidden({ body: { message: this.message } });
      default:
        assertNever(this.reason);
    }
  }
}
