/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isEmpty, omit } from 'lodash';

/**
 * This model captures the grok debugger response from upstream to be passed to
 * the view
 */
export class GrokdebuggerResponse {
  constructor(props) {
    this.structuredEvent = get(props, 'structuredEvent', {});
    this.error = get(props, 'error', {});
  }

  // generate GrokdebuggerResponse object from elasticsearch response
  static fromUpstreamJSON(upstreamGrokdebuggerResponse) {
    const docs = get(upstreamGrokdebuggerResponse, 'docs');
    const error = docs[0].error;
    if (!isEmpty(error)) {
      const opts = { 'error': 'Provided Grok patterns do not match data in the input' };
      return new GrokdebuggerResponse(opts);
    }
    const structuredEvent = omit(get(docs, '0.doc._source'), 'rawEvent');
    const opts = { structuredEvent };
    return new GrokdebuggerResponse(opts);
  }
}
