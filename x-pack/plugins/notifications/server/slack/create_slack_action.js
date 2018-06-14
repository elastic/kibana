/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SlackAction } from './slack_action';

/**
 * Create a Slack options object from the config.
 *
 * @param {Object} config The server configuration.
 * @return {Object} An object that configures Slack.
 */
export function optionsFromConfig(config) {
  return {
    token: config.get('xpack.notifications.slack.token')
  };
}

/**
 * Create a Slack defaults object from the config.
 *
 * Defaults include things like the default channel that messages are posted to.
 *
 * @param {Object} config The server configuration.
 * @return {Object} An object that configures Slack on a per-message basis.
 */
export function defaultsFromConfig(config) {
  return {
    channel: config.get('xpack.notifications.slack.defaults.channel'),
    as_user: config.get('xpack.notifications.slack.defaults.as_user'),
    icon_emoji: config.get('xpack.notifications.slack.defaults.icon_emoji'),
    icon_url: config.get('xpack.notifications.slack.defaults.icon_url'),
    link_names: config.get('xpack.notifications.slack.defaults.link_names'),
    mrkdwn: config.get('xpack.notifications.slack.defaults.mrkdwn'),
    unfurl_links: config.get('xpack.notifications.slack.defaults.unfurl_links'),
    unfurl_media: config.get('xpack.notifications.slack.defaults.unfurl_media'),
    username: config.get('xpack.notifications.slack.defaults.username'),
  };
}

/**
 * Create a new Slack Action based on the configuration.
 *
 * @param {Object} server The server object.
 * @return {SlackAction} A new Slack Action based on the kibana.yml configuration.
 */
export function createSlackAction(server, { _options = optionsFromConfig, _defaults = defaultsFromConfig } = { }) {
  const config = server.config();

  const options = _options(config);
  const defaults = _defaults(config);

  return new SlackAction({ server, options, defaults });
}
