/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class LogstashSecurityService {
  constructor(xpackInfoService) {
    this.xpackInfoService = xpackInfoService;
  }

  get isSecurityEnabled() {
    return Boolean(this.xpackInfoService.get(`features.security`));
  }
}
