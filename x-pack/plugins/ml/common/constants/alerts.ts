/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ActionGroup } from '../../../alerts/common';
import { MINIMUM_FULL_LICENSE } from '../license';
import { PLUGIN_ID } from './app';

export const ML_ALERT_TYPES = {
  ANOMALY_DETECTION: 'xpack.ml.anomaly_threshold',
} as const;

export type MlAlertType = typeof ML_ALERT_TYPES[keyof typeof ML_ALERT_TYPES];

export const ANOMALY_SCORE_MATCH_GROUP_ID = 'anomaly_score_match';
export type AnomalyScoreMatchGroupId = typeof ANOMALY_SCORE_MATCH_GROUP_ID;
export const THRESHOLD_MET_GROUP: ActionGroup<AnomalyScoreMatchGroupId> = {
  id: ANOMALY_SCORE_MATCH_GROUP_ID,
  name: i18n.translate('xpack.ml.anomalyDetectionAlert.actionGroupName', {
    defaultMessage: 'Anomaly score matched the condition',
  }),
};

export const ML_ALERT_TYPES_CONFIG: Record<
  MlAlertType,
  {
    name: string;
    actionGroups: Array<ActionGroup<AnomalyScoreMatchGroupId>>;
    defaultActionGroupId: AnomalyScoreMatchGroupId;
    minimumLicenseRequired: string;
    producer: string;
  }
> = {
  [ML_ALERT_TYPES.ANOMALY_DETECTION]: {
    name: i18n.translate('xpack.ml.anomalyDetectionAlert.name', {
      defaultMessage: 'Anomaly detection alert',
    }),
    actionGroups: [THRESHOLD_MET_GROUP],
    defaultActionGroupId: ANOMALY_SCORE_MATCH_GROUP_ID,
    minimumLicenseRequired: MINIMUM_FULL_LICENSE,
    producer: PLUGIN_ID,
  },
};
