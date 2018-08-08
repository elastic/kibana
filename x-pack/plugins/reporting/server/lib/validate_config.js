/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import crypto from 'crypto';

export function validateConfig(config, log) {
  const encryptionKey = config.get('xpack.reporting.encryptionKey');
  if (encryptionKey === null || encryptionKey === undefined) {
    log('Generating a random key for xpack.reporting.encryptionKey. To prevent pending reports from failing on ' +
      'restart, please set xpack.reporting.encryptionKey in kibana.yml');
    config.set('xpack.reporting.encryptionKey', crypto.randomBytes(16).toString('hex'));
  }
}
