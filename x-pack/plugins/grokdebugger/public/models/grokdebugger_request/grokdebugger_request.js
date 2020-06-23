/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, pick } from 'lodash';

export class GrokdebuggerRequest {
  constructor(props = {}) {
    this.rawEvent = get(props, 'rawEvent', '');
    this.pattern = get(props, 'pattern', '');
    this.customPatterns = get(props, 'customPatterns', {});
  }

  get upstreamJSON() {
    return pick(this, ['rawEvent', 'pattern', 'customPatterns']);
  }
}
