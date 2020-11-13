/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MLErrorObject, ErrorType } from './types';

export class MLRequestFailure extends Error {
  constructor(error: MLErrorObject, resp: ErrorType) {
    super(error.message);
    Object.setPrototypeOf(this, new.target.prototype);

    if (typeof resp !== 'string' && typeof resp !== 'undefined') {
      if ('body' in resp) {
        this.stack = JSON.stringify(resp.body, null, 2);
      } else {
        try {
          this.stack = JSON.stringify(resp, null, 2);
        } catch (e) {
          // fail silently
        }
      }
    }
  }
}
