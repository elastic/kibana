/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

interface ConnectorFeatureConfig {
  /**
   * Unique identifier for this feature.
   */
  id: string;

  /**
   * Display name for this feature.
   * This will be displayed to end-users, so a translatable string is advised for i18n.
   */
  name: string;
}

export const AlertingConnectorFeatureId = 'alerting';
export const CasesConnectorFeatureId = 'cases';
export const UptimeConnectorFeatureId = 'uptime';
export const SecurityConnectorFeatureId = 'siem';

export const AlertingConnectorFeature: ConnectorFeatureConfig = {
  id: AlertingConnectorFeatureId,
  name: i18n.translate('xpack.actions.availableConnectorFeatures.alerting', {
    defaultMessage: 'Alerting',
  }),
};

export const CasesConnectorFeature: ConnectorFeatureConfig = {
  id: CasesConnectorFeatureId,
  name: i18n.translate('xpack.actions.availableConnectorFeatures.cases', {
    defaultMessage: 'Cases',
  }),
};

export const UptimeConnectorFeature: ConnectorFeatureConfig = {
  id: UptimeConnectorFeatureId,
  name: i18n.translate('xpack.actions.availableConnectorFeatures.uptime', {
    defaultMessage: 'Uptime',
  }),
};

export const SecuritySolutionFeature: ConnectorFeatureConfig = {
  id: SecurityConnectorFeatureId,
  name: i18n.translate('xpack.actions.availableConnectorFeatures.securitySolution', {
    defaultMessage: 'Security Solution',
  }),
};

const AllAvailableConnectorFeatures: ConnectorFeatureConfig[] = [
  AlertingConnectorFeature,
  CasesConnectorFeature,
  UptimeConnectorFeature,
  SecuritySolutionFeature,
];

export function areValidFeatures(ids: string[]) {
  return ids.every(
    (id: string) =>
      !!AllAvailableConnectorFeatures.find((config: ConnectorFeatureConfig) => config.id === id)
  );
}

export function getConnectorFeatureName(id: string) {
  const featureConfig = AllAvailableConnectorFeatures.find((config) => config.id === id);
  return featureConfig ? featureConfig.name : id;
}
