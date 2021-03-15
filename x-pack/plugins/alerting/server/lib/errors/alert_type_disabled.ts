/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from '../../../../../../src/core/server';
import { ErrorThatHandlesItsOwnResponse } from './types';

export type AlertTypeDisabledReason =
  | 'config'
  | 'license_unavailable'
  | 'license_invalid'
  | 'license_expired';

export class AlertTypeDisabledError extends Error implements ErrorThatHandlesItsOwnResponse {
  public readonly reason: AlertTypeDisabledReason;

  constructor(message: string, reason: AlertTypeDisabledReason) {
    super(message);
    this.reason = reason;
  }

  public sendResponse(res: KibanaResponseFactory) {
    return res.forbidden({ body: { message: this.message } });
  }
}
