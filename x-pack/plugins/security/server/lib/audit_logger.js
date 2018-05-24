/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function createAuditLogger(server) {
  const log = (msg, data) => {
    server.log(['security', 'audit'], {
      tmpl: msg,
      ...data
    });
  };

  return {
    authenticationFailure: (request, username) => {
      log(`Authentication failed for ${username}`, {
        eventType: 'authentication_failure',
        username
      });
    },

    authenticationSuccess: (request, username) => {
      log(`Authentication successful for ${username}`, {
        eventType: 'authentication_success',
        username
      });
    }
  };
}
