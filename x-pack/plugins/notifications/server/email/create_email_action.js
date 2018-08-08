/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EmailAction } from './email_action';

/**
 * Create a Nodemailer transporter options object from the config.
 *
 * @param {Object} config The server configuration.
 * @return {Object} An object that configures Nodemailer.
 */
export function optionsFromConfig(config) {
  return {
    host: config.get('xpack.notifications.email.smtp.host'),
    port: config.get('xpack.notifications.email.smtp.port'),
    requireTLS: config.get('xpack.notifications.email.smtp.require_tls'),
    pool: config.get('xpack.notifications.email.smtp.pool'),
    auth: {
      user: config.get('xpack.notifications.email.smtp.auth.username'),
      pass: config.get('xpack.notifications.email.smtp.auth.password'),
    },
  };
}

/**
 * Create a Nodemailer defaults object from the config.
 *
 * Defaults include things like the default "from" email address.
 *
 * @param {Object} config The server configuration.
 * @return {Object} An object that configures Nodemailer on a per-message basis.
 */
export function defaultsFromConfig(config) {
  return {
    from: config.get('xpack.notifications.email.defaults.from'),
    to: config.get('xpack.notifications.email.defaults.to'),
    cc: config.get('xpack.notifications.email.defaults.cc'),
    bcc: config.get('xpack.notifications.email.defaults.bcc'),
  };
}

/**
 * Create a new Email Action based on the configuration.
 *
 * @param {Object} server The server object.
 * @return {EmailAction} A new email action based on the kibana.yml configuration.
 */
export function createEmailAction(server, { _options = optionsFromConfig, _defaults = defaultsFromConfig } = { }) {
  const config = server.config();

  const options = _options(config);
  const defaults = _defaults(config);

  return new EmailAction({ server, options, defaults });
}
