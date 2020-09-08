/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KbnError } from '../../../../../../src/plugins/kibana_utils/public';

export class MLRequestFailure extends KbnError {
  // takes an Error object and and optional response object

  constructor(error: any, resp: any) {
    super(error.message);

    if (typeof resp === 'object') {
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
