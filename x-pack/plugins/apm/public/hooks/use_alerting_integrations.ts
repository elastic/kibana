/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useApmPluginContext } from './useApmPluginContext';

export const useAlertingIntegrations = () => {
  const plugin = useApmPluginContext();

  const capabilities = plugin.core.application.capabilities;
  const canReadAlerts = !!capabilities.apm['alerting:show'];
  const canSaveAlerts = !!capabilities.apm['alerting:save'];
  const isAlertingPluginEnabled = 'alerts' in plugin.plugins;
  const isAlertingAvailable =
    isAlertingPluginEnabled && (canReadAlerts || canSaveAlerts);
  const isMlPluginEnabled = 'ml' in plugin.plugins;
  const canReadAnomalies = !!(
    isMlPluginEnabled &&
    capabilities.ml.canAccessML &&
    capabilities.ml.canGetJobs
  );

  return {
    isAlertingAvailable,
    canReadAlerts,
    canSaveAlerts,
    canReadAnomalies,
  };
};
