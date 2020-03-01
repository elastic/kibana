/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Instance } from './types';

class ServiceNow {
  constructor(private readonly instance: Instance) {
    if (
      !this.instance ||
      !this.instance.url ||
      !this.instance.username ||
      !this.instance.password
    ) {
      throw Error('[Action][ServiceNow]: Wrong configuration.');
    }
  }
}

export { ServiceNow };
