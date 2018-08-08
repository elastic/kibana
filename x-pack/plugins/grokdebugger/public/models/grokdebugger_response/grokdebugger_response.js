/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

export class GrokdebuggerResponse {
  constructor(props) {
    this.structuredEvent = get(props, 'structuredEvent', {});
    this.error = get(props, 'error', {});
  }

  static fromUpstreamJSON(grokdebuggerResponse) {
    return new GrokdebuggerResponse(grokdebuggerResponse);
  }
}
