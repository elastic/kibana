/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { AlertConsumers } from '@kbn/rule-data-utils';
import {
  APM_DISPLAY_NAME,
  INFRASTRUCTURE_DISPLAY_NAME,
  LOGS_DISPLAY_NAME,
  ML_DISPLAY_NAME,
  OBSERVABILITY_DISPLAY_NAME,
  SECURITY_DISPLAY_NAME,
  SLO_DISPLAY_NAME,
  STACK_MANAGEMENT_DISPLAY_NAME,
  STACK_MONITORING_DISPLAY_NAME,
  UPTIME_DISPLAY_NAME,
} from '../translations';

interface AlertProducerData {
  displayName: string;
  icon: EuiIconType;
  subFeatureIds?: AlertConsumers[];
}

export const observabilityFeatureIds: AlertConsumers[] = [
  AlertConsumers.OBSERVABILITY,
  AlertConsumers.APM,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.SLO,
  AlertConsumers.UPTIME,
  AlertConsumers.MONITORING,
];

export const [_, ...observabilityApps] = observabilityFeatureIds;

export const alertProducersData: Record<AlertConsumers, AlertProducerData> = {
  [AlertConsumers.OBSERVABILITY]: {
    displayName: OBSERVABILITY_DISPLAY_NAME,
    icon: 'logoObservability',
    subFeatureIds: observabilityFeatureIds,
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
  [AlertConsumers.MONITORING]: {
    displayName: STACK_MONITORING_DISPLAY_NAME,
    icon: 'monitoringApp',
  },
  [AlertConsumers.ML]: {
    displayName: ML_DISPLAY_NAME,
    icon: 'machineLearningApp',
  },
  [AlertConsumers.SIEM]: {
    displayName: SECURITY_DISPLAY_NAME,
    icon: 'logoSecurity',
  },
  [AlertConsumers.STACK_ALERTS]: {
    displayName: STACK_MANAGEMENT_DISPLAY_NAME,
    icon: 'managementApp',
  },
  [AlertConsumers.EXAMPLE]: {
    displayName: 'Example',
    icon: 'beaker',
  },
};
