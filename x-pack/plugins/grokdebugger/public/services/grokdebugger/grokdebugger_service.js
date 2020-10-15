/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ROUTES } from '../../../common/constants';
import { GrokdebuggerResponse } from '../../models/grokdebugger_response';

export class GrokdebuggerService {
  constructor(http) {
    this.http = http;
  }

  simulate(grokdebuggerRequest) {
    return this.http
      .post(`${ROUTES.API_ROOT}/simulate`, {
        body: JSON.stringify(grokdebuggerRequest.upstreamJSON),
      })
      .then((response) => {
        return GrokdebuggerResponse.fromUpstreamJSON(response);
      })
      .catch((e) => {
        throw e.body.message;
      });
  }
}
