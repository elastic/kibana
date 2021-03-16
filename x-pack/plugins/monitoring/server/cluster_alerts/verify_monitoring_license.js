/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';

/**
 * Determine if an API for Cluster Alerts should respond based on the license and configuration of the monitoring cluster.
 *
 * Note: This does not guarantee that any production cluster has a valid license; only that Cluster Alerts in general can be used!
 *
 * @param  {Object} server Server object containing config and plugins
 * @return {Boolean} {@code true} to indicate that cluster alerts can be used.
 */
export async function verifyMonitoringLicense(server) {
  const config = server.config();

  // if cluster alerts are enabled, then ensure that we can use it according to the license
  if (config.get('monitoring.cluster_alerts.enabled')) {
    const xpackInfo = get(server.plugins.monitoring, 'info');
    if (xpackInfo) {
      const licenseService = await xpackInfo.getLicenseService();
      const watcherFeature = licenseService.getWatcherFeature();
      return {
        enabled: watcherFeature.isEnabled,
        message: licenseService.getMessage(),
      };
    }

    return {
      enabled: false,
      message: i18n.translate('xpack.monitoring.clusterAlerts.notDeterminedLicenseDescription', {
        defaultMessage: 'Status of Cluster Alerts feature could not be determined.',
      }),
    };
  }

  return {
    enabled: false,
    message: i18n.translate('xpack.monitoring.clusterAlerts.disabledLicenseDescription', {
      defaultMessage: 'Cluster Alerts feature is disabled.',
    }),
  };
}
