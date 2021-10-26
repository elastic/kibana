/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
    deprecate('enabled', '8.0.0'),
    // This order matters. The "blanket rename" needs to happen at the end
    renameFromRoot('xpack.monitoring.max_bucket_size', 'monitoring.ui.max_bucket_size'),
    renameFromRoot('xpack.monitoring.min_interval_seconds', 'monitoring.ui.min_interval_seconds'),
    renameFromRoot(
      'xpack.monitoring.show_license_expiration',
      'monitoring.ui.show_license_expiration'
    ),
    renameFromRoot(
      'xpack.monitoring.ui.container.elasticsearch.enabled',
      'monitoring.ui.container.elasticsearch.enabled'
    ),
    renameFromRoot(
      'xpack.monitoring.ui.container.logstash.enabled',
      'monitoring.ui.container.logstash.enabled'
    ),
    renameFromRoot('xpack.monitoring.elasticsearch', 'monitoring.ui.elasticsearch'),
    renameFromRoot('xpack.monitoring.ccs.enabled', 'monitoring.ui.ccs.enabled'),
    renameFromRoot(
      'xpack.monitoring.elasticsearch.logFetchCount',
      'monitoring.ui.elasticsearch.logFetchCount'
    ),
    renameFromRoot('xpack.monitoring', 'monitoring'),
    rename('xpack_api_polling_frequency_millis', 'licensing.api_polling_frequency'),

    // TODO: Add deprecations for "monitoring.ui.elasticsearch.username: elastic" and "monitoring.ui.elasticsearch.username: kibana".
    // TODO: Add deprecations for using "monitoring.ui.elasticsearch.ssl.certificate" without "monitoring.ui.elasticsearch.ssl.key", and
    // vice versa.
    // ^ These deprecations should only be shown if they are explicitly configured for monitoring -- we should not show Monitoring
    // deprecations for these settings if they are inherited from the Core elasticsearch settings.
    // See the Core implementation: src/core/server/elasticsearch/elasticsearch_config.ts
  ];
};
