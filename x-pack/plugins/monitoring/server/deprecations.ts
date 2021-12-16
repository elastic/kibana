/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConfigDeprecation, ConfigDeprecationFactory } from 'kibana/server';

/**
 * Re-writes deprecated user-defined config settings and logs warnings as a
 * result of any rewrite operations.
 *
 * Important: Do not remove any deprecation warning until at least the next
 * major version!
 * @return {Array} array of rename operations and callback function for rename logging
 */
export const deprecations = ({
  deprecate,
  rename,
  renameFromRoot,
}: ConfigDeprecationFactory): ConfigDeprecation[] => {
  return [
    deprecate('enabled', '8.0.0', { level: 'critical' }),
    deprecate('cluster_alerts.allowedSpaces', '8.0.0', {
      level: 'warning',
      message: i18n.translate('xpack.monitoring.deprecations.allowedSpaces', {
        defaultMessage:
          'Starting in 7.15, the Stack Monitoring application will prompt you to create cluster alerts rather than creating them automatically in allowed spaces.' +
          ' This configuration is no longer used and will be removed in a future version. ',
      }),
    }),
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
      {
        level: 'warning',
      }
    ),
    renameFromRoot(
      'xpack.monitoring.ui.container.elasticsearch.enabled',
      'monitoring.ui.container.elasticsearch.enabled',
      {
        level: 'warning',
      }
    ),
    renameFromRoot(
      'xpack.monitoring.ui.container.logstash.enabled',
      'monitoring.ui.container.logstash.enabled',
      {
        level: 'warning',
      }
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
      {
        level: 'warning',
      }
    ),
    renameFromRoot('xpack.monitoring', 'monitoring', {
      level: 'warning',
    }),
    rename('xpack_api_polling_frequency_millis', 'licensing.api_polling_frequency', {
      level: 'warning',
    }),

    // TODO: Add deprecations for "monitoring.ui.elasticsearch.username: elastic" and "monitoring.ui.elasticsearch.username: kibana".
    // TODO: Add deprecations for using "monitoring.ui.elasticsearch.ssl.certificate" without "monitoring.ui.elasticsearch.ssl.key", and
    // vice versa.
    // ^ These deprecations should only be shown if they are explicitly configured for monitoring -- we should not show Monitoring
    // deprecations for these settings if they are inherited from the Core elasticsearch settings.
    // See the Core implementation: src/core/server/elasticsearch/elasticsearch_config.ts
  ];
};
