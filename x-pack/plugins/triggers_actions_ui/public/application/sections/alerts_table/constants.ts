/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { i18n } from '@kbn/i18n';
import { AlertConsumers } from '@kbn/rule-data-utils';

export const OBSERVABILITY_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.observability',
  {
    defaultMessage: 'Observability',
  }
);

export const SECURITY_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.security',
  {
    defaultMessage: 'Security',
  }
);

export const STACK_MANAGEMENT_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.stackManagement',
  {
    defaultMessage: 'Stack management',
  }
);

export const UPTIME_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.uptime',
  {
    defaultMessage: 'Uptime',
  }
);

export const APM_DISPLAY_NAME = i18n.translate('xpack.triggersActionsUI.sections.alertsTable.apm', {
  defaultMessage: 'APM',
});

export const INFRASTRUCTURE_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.infrastructure',
  {
    defaultMessage: 'Infrastructure',
  }
);

export const SLO_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.slos',
  {
    defaultMessage: 'SLOs',
  }
);

export const LOGS_DISPLAY_NAME = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsTable.logs',
  {
    defaultMessage: 'Logs',
  }
);

export const ML_DISPLAY_NAME = i18n.translate('xpack.triggersActionsUI.sections.alertsTable.ml', {
  defaultMessage: 'Machine Learning',
});

interface AlertProducerData {
  displayName: string;
  icon: EuiIconType;
}

export const observabilityProducers = [
  AlertConsumers.OBSERVABILITY,
  AlertConsumers.APM,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.SLO,
  AlertConsumers.UPTIME,
];

export const [_, ...observabilityApps] = observabilityProducers;

export const alertProducersData: Record<AlertConsumers, AlertProducerData> = {
  [AlertConsumers.OBSERVABILITY]: {
    displayName: OBSERVABILITY_DISPLAY_NAME,
    icon: 'logoObservability',
  },
  [AlertConsumers.APM]: {
    displayName: APM_DISPLAY_NAME,
    icon: 'apmApp',
  },
  [AlertConsumers.INFRASTRUCTURE]: {
    displayName: INFRASTRUCTURE_DISPLAY_NAME,
    icon: 'logoObservability',
  },
  [AlertConsumers.LOGS]: {
    displayName: LOGS_DISPLAY_NAME,
    icon: 'logsApp',
  },
  [AlertConsumers.SLO]: {
    displayName: SLO_DISPLAY_NAME,
    icon: 'logoObservability',
  },
  [AlertConsumers.UPTIME]: {
    displayName: UPTIME_DISPLAY_NAME,
    icon: 'uptimeApp',
  },
  [AlertConsumers.ML]: {
    displayName: ML_DISPLAY_NAME,
    icon: 'machineLearningApp',
  },
  [AlertConsumers.SIEM]: {
    displayName: SECURITY_DISPLAY_NAME,
    icon: 'securityApp',
  },
  [AlertConsumers.STACK_ALERTS]: {
    displayName: STACK_MANAGEMENT_DISPLAY_NAME,
    icon: 'managementApp',
  },
};
