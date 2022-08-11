/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities } from '@kbn/core/public';
import { ApmPluginSetupDeps } from '../../plugin';

export const getAlertingCapabilities = (
  plugins: ApmPluginSetupDeps,
  capabilities: Capabilities
) => {
  const canReadAlerts = !!capabilities.apm['alerting:show'];
  const canSaveAlerts = !!capabilities.apm['alerting:save'];
  const isAlertingPluginEnabled = !!plugins.alerting;
  const isAlertingAvailable =
    isAlertingPluginEnabled && (canReadAlerts || canSaveAlerts);
  const isMlPluginEnabled = 'ml' in plugins;
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
