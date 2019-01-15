/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class AuditLogger {
  constructor(server, pluginId) {
    this._server = server;
    this._pluginId = pluginId;
  }

  log(eventType, message, data = {}) {
    this._server.logWithMetadata(['info', 'audit', this._pluginId, eventType], message, {
      ...data,
      eventType,
    });
  }
}
