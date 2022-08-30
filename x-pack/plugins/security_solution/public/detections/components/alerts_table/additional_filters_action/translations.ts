/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADDITIONAL_FILTERS_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.additionalFiltersTitle',
  {
    defaultMessage: 'Additional filters',
  }
);

export const ADDITIONAL_FILTERS_ACTIONS_SHOW_BUILDING_BLOCK = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.additionalFiltersActions.showBuildingBlockTitle',
  {
    defaultMessage: 'Include building block alerts',
  }
);

export const ADDITIONAL_FILTERS_ACTIONS_SHOW_ONLY_THREAT_INDICATOR_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.additionalFiltersActions.showOnlyThreatIndicatorAlerts',
  {
    defaultMessage: 'Show only threat indicator alerts',
  }
);

export const TAKE_ACTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.utilityBar.takeActionTitle',
  {
    defaultMessage: 'Take action',
  }
);
