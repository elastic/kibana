/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, has, set, unset } from 'lodash';
import { CLUSTER_ALERTS_ADDRESS_CONFIG_KEY } from './common/constants';

/**
 * Re-writes deprecated user-defined config settings and logs warnings as a
 * result of any rewrite operations.
 *
 * Important: Do not remove any deprecation warning until at least the next
 * major version!
 * @param rename {Function} config rename function from Kibana
 * @return {Array} array of rename operations and callback function for rename logging
 */
export const deprecations = ({ rename }) => {
  return [
    rename('elasticsearch.ssl.ca', 'elasticsearch.ssl.certificateAuthorities'),
    rename('elasticsearch.ssl.cert', 'elasticsearch.ssl.certificate'),
    (settings, log) => {
      if (!has(settings, 'elasticsearch.ssl.verify')) {
        return;
      }

      const verificationMode = get(settings, 'elasticsearch.ssl.verify') ? 'full' : 'none';
      set(settings, 'elasticsearch.ssl.verificationMode', verificationMode);
      delete settings.elasticsearch.ssl.verify;

      log('Config key "xpack.monitoring.elasticsearch.ssl.verify" is deprecated. ' +
        'It has been replaced with "xpack.monitoring.elasticsearch.ssl.verificationMode"');
    },
    (settings, log) => {
      if (has(settings, 'report_stats')) {
        log('Config key "xpack.monitoring.report_stats" is deprecated and will be removed in 7.0. ' +
          'Use "xpack.xpack_main.telemetry.enabled" instead.');
      }
    },
    (settings, log) => {
      const clusterAlertsEnabled = get(settings, 'cluster_alerts.enabled');
      const emailNotificationsEnabled = clusterAlertsEnabled && get(settings, 'cluster_alerts.email_notifications.enabled');
      if (emailNotificationsEnabled && !get(settings, CLUSTER_ALERTS_ADDRESS_CONFIG_KEY)) {
        log(`Config key "${CLUSTER_ALERTS_ADDRESS_CONFIG_KEY}" will be required for email notifications to work in 7.0."`);
      }
    },
    (settings, log) => {
      const deprecatedUrl = get(settings, 'url');
      const hosts = get(settings, 'hosts.length');
      if (!deprecatedUrl) {
        return;
      }
      if (hosts) {
        log('Deprecated config key "xpack.monitoring.elasticsearch.url" ' +
          'conflicts with "xpack.monitoring.elasticsearch.hosts".  Ignoring "elasticsearch.url"');
      } else {
        set(settings, 'hosts', [deprecatedUrl]);
        log('Config key "xpack.monitoring.elasticsearch.url" is deprecated.' +
          'It has been replaced with "xpack.monitoring.elasticsearch.hosts"');
      }
      unset(settings, 'url');
    }
  ];
};
