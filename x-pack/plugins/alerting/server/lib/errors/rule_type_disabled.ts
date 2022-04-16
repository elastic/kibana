/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaResponseFactory } from '@kbn/core/server';
import { ErrorThatHandlesItsOwnResponse } from './types';

export type RuleTypeDisabledReason =
  | 'config'
  | 'license_unavailable'
  | 'license_invalid'
  | 'license_expired';

export class RuleTypeDisabledError extends Error implements ErrorThatHandlesItsOwnResponse {
  public readonly reason: RuleTypeDisabledReason;

  constructor(message: string, reason: RuleTypeDisabledReason) {
    super(message);
    this.reason = reason;
  }

  public sendResponse(res: KibanaResponseFactory) {
    return res.forbidden({ body: { message: this.message } });
  }
}
