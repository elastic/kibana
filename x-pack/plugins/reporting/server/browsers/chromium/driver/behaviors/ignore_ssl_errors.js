/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class IgnoreSSLErrorsBehavior {
  constructor(client) {
    this._client = client;
  }

  async initialize() {
    const { Security } = this._client;
    await Security.enable();
    await Security.setOverrideCertificateErrors({ override: true });
    Security.certificateError(({ eventId }) => {
      Security.handleCertificateError({ eventId, action: 'continue' });
    });
  }
}
