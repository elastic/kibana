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

export const AlertingConnectorFeature: ConnectorFeatureConfig = {
  id: 'alerting',
  name: i18n.translate('xpack.actions.availableConnectorFeatures.alerting', {
    defaultMessage: 'Alerting',
  }),
};

export const CasesConnectorFeature: ConnectorFeatureConfig = {
  id: 'cases',
  name: i18n.translate('xpack.actions.availableConnectorFeatures.cases', {
    defaultMessage: 'Cases',
  }),
};

const AllAvailableConnectorFeatures: ConnectorFeatureConfig[] = [
  AlertingConnectorFeature,
  CasesConnectorFeature,
];

export function areValidFeatures(ids: string[]) {
  return ids.every(
    (id: string) =>
      !!AllAvailableConnectorFeatures.find((config: ConnectorFeatureConfig) => config.id === id)
  );
}
