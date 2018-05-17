/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const crypto = require('crypto');

export function validateConfig(config, log) {
  if (config.get('xpack.security.encryptionKey') == null) {
    log('Generating a random key for xpack.security.encryptionKey. To prevent sessions from being invalidated on ' +
      'restart, please set xpack.security.encryptionKey in kibana.yml');

    config.set('xpack.security.encryptionKey', crypto.randomBytes(16).toString('hex'));
  } else if (config.get('xpack.security.encryptionKey').length < 32) {
    throw new Error('xpack.security.encryptionKey must be at least 32 characters. Please update the key in kibana.yml.');
  }

  const isSslConfigured = config.get('server.ssl.key') != null && config.get('server.ssl.certificate') != null;
  if (!isSslConfigured) {
    if (config.get('xpack.security.secureCookies')) {
      log('Using secure cookies, but SSL is not enabled inside Kibana. SSL must be configured outside of Kibana to ' +
        'function properly.');
    } else {
      log('Session cookies will be transmitted over insecure connections. This is not recommended.');
    }
  } else {
    config.set('xpack.security.secureCookies', true);
  }
}