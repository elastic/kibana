/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaResponseFactory } from '../../../../../../src/core/server';
import { ErrorThatHandlesItsOwnResponse } from './types';

export type ActionTypeDisabledReason =
  | 'config'
  | 'license_unavailable'
  | 'license_invalid'
  | 'license_expired';

export class ActionTypeDisabledError extends Error implements ErrorThatHandlesItsOwnResponse {
  public readonly reason: ActionTypeDisabledReason;

  constructor(message: string, reason: ActionTypeDisabledReason) {
    super(message);
    this.reason = reason;
  }

  public sendResponse(res: KibanaResponseFactory) {
    return res.forbidden({ body: { message: this.message } });
  }
}
