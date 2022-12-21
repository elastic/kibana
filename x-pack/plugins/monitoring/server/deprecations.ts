/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
export const deprecations = ({
  rename,
  renameFromRoot,
  unused,
}: ConfigDeprecationFactory): ConfigDeprecation[] => {
  return [
    // This order matters. The "blanket rename" needs to happen at the end
    renameFromRoot('xpack.monitoring.max_bucket_size', 'monitoring.ui.max_bucket_size', {
      level: 'warning',
    }),
    renameFromRoot('xpack.monitoring.min_interval_seconds', 'monitoring.ui.min_interval_seconds', {
      level: 'warning',
    }),
    renameFromRoot(
      'xpack.monitoring.show_license_expiration',
      'monitoring.ui.show_license_expiration',
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.monitoring.ui.container.elasticsearch.enabled',
      'monitoring.ui.container.elasticsearch.enabled',
      { level: 'warning' }
    ),
    renameFromRoot(
      'xpack.monitoring.ui.container.logstash.enabled',
      'monitoring.ui.container.logstash.enabled',
      { level: 'warning' }
    ),
    renameFromRoot('xpack.monitoring.elasticsearch', 'monitoring.ui.elasticsearch', {
      level: 'warning',
    }),
    renameFromRoot('xpack.monitoring.ccs.enabled', 'monitoring.ui.ccs.enabled', {
      level: 'warning',
    }),
    renameFromRoot(
      'xpack.monitoring.elasticsearch.logFetchCount',
      'monitoring.ui.elasticsearch.logFetchCount',
      { level: 'warning' }
    ),
    renameFromRoot('xpack.monitoring', 'monitoring', { level: 'warning' }),
    (config, fromPath, addDeprecation) => {
      const emailNotificationsEnabled = get(config, 'cluster_alerts.email_notifications.enabled');
      if (emailNotificationsEnabled && !get(config, CLUSTER_ALERTS_ADDRESS_CONFIG_KEY)) {
        addDeprecation({
          configPath: `cluster_alerts.email_notifications.enabled`,
          message: `Config key [${fromPath}.${CLUSTER_ALERTS_ADDRESS_CONFIG_KEY}] will be required for email notifications to work in 8.0."`,
          correctiveActions: {
            manualSteps: [
              `Add [${fromPath}.${CLUSTER_ALERTS_ADDRESS_CONFIG_KEY}] to your kibana configs."`,
            ],
          },
          level: 'critical',
        });
      }
      return config;
    },
    rename('xpack_api_polling_frequency_millis', 'licensing.api_polling_frequency', {
      level: 'warning',
    }),

    unused('cluster_alerts.allowedSpaces', { level: 'warning' }),
    unused('monitoring.ui.metricbeat.index', { level: 'warning' }),

    // TODO: Add deprecations for "monitoring.ui.elasticsearch.username: elastic" and "monitoring.ui.elasticsearch.username: kibana".
    // TODO: Add deprecations for using "monitoring.ui.elasticsearch.ssl.certificate" without "monitoring.ui.elasticsearch.ssl.key", and
    // vice versa.
    // ^ These deprecations should only be shown if they are explicitly configured for monitoring -- we should not show Monitoring
    // deprecations for these settings if they are inherited from the Core elasticsearch settings.
    // See the Core implementation: src/core/server/elasticsearch/elasticsearch_config.ts
  ];
};
