/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { ConfigDeprecationFactory, ConfigDeprecation } from 'kibana/server';
import { CLUSTER_ALERTS_ADDRESS_CONFIG_KEY } from '../common/constants';

/**
 * Re-writes deprecated user-defined config settings and logs warnings as a
 * result of any rewrite operations.
 *
 * Important: Do not remove any deprecation warning until at least the next
 * major version!
 * @return {Array} array of rename operations and callback function for rename logging
 */
export const deprecations = ({ rename }: ConfigDeprecationFactory): ConfigDeprecation[] => {
  return [
    (config, fromPath, logger) => {
      const clusterAlertsEnabled = get(config, 'cluster_alerts.enabled');
      const emailNotificationsEnabled =
        clusterAlertsEnabled && get(config, 'cluster_alerts.email_notifications.enabled');
      if (emailNotificationsEnabled && !get(config, CLUSTER_ALERTS_ADDRESS_CONFIG_KEY)) {
        logger(
          `Config key [${fromPath}.${CLUSTER_ALERTS_ADDRESS_CONFIG_KEY}] will be required for email notifications to work in 7.0."`
        );
      }
      return config;
    },
    (config, fromPath, logger) => {
      const es: Record<string, any> = get(config, 'elasticsearch');
      if (es) {
        if (es.username === 'elastic') {
          logger(
            `Setting [${fromPath}.username] to "elastic" is deprecated. You should use the "kibana" user instead.`
          );
        }
      }
      return config;
    },
    (config, fromPath, logger) => {
      const ssl: Record<string, any> = get(config, 'elasticsearch.ssl');
      if (ssl) {
        if (ssl.key !== undefined && ssl.certificate === undefined) {
          logger(
            `Setting [${fromPath}.key] without [${fromPath}.certificate] is deprecated. This has no effect, you should use both settings to enable TLS client authentication to Elasticsearch.`
          );
        } else if (ssl.certificate !== undefined && ssl.key === undefined) {
          logger(
            `Setting [${fromPath}.certificate] without [${fromPath}.key] is deprecated. This has no effect, you should use both settings to enable TLS client authentication to Elasticsearch.`
          );
        }
      }
      return config;
    },
    rename('xpack_api_polling_frequency_millis', 'licensing.api_polling_frequency'),
  ];
};
