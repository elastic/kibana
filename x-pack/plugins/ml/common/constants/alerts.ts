/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { schema, TypeOf } from '@kbn/config-schema';
import { ActionGroup } from '../../../alerts/common';
import { MINIMUM_FULL_LICENSE } from '../license';
import { PLUGIN_ID } from './app';

export const ML_ALERT_TYPES = {
  ANOMALY_THRESHOLD: 'xpack.ml.anomaly_threshold',
} as const;

export type MlAlertType = typeof ML_ALERT_TYPES[keyof typeof ML_ALERT_TYPES];

export const THRESHOLD_MET_GROUP_ID = 'anomaly_threshold_met';
export type ThresholdMetActionGroupId = typeof THRESHOLD_MET_GROUP_ID;
export const THRESHOLD_MET_GROUP: ActionGroup<ThresholdMetActionGroupId> = {
  id: THRESHOLD_MET_GROUP_ID,
  name: i18n.translate('xpack.apm.a.thresholdMet', {
    defaultMessage: 'Anomaly threshold met',
  }),
};

export const ML_ALERT_TYPES_CONFIG: Record<
  MlAlertType,
  {
    name: string;
    actionGroups: Array<ActionGroup<ThresholdMetActionGroupId>>;
    defaultActionGroupId: ThresholdMetActionGroupId;
    minimumLicenseRequired: string;
    producer: string;
  }
> = {
  [ML_ALERT_TYPES.ANOMALY_THRESHOLD]: {
    name: i18n.translate('xpack.apm.errorCountAlert.name', {
      defaultMessage: 'Anomaly threshold',
    }),
    actionGroups: [THRESHOLD_MET_GROUP],
    defaultActionGroupId: THRESHOLD_MET_GROUP_ID,
    minimumLicenseRequired: MINIMUM_FULL_LICENSE,
    producer: PLUGIN_ID,
  },
};

export const mlAnomalyThresholdAlertParams = schema.object({
  jobSelection: schema.object(
    {
      jobIds: schema.maybe(schema.arrayOf(schema.string())),
      groupIds: schema.maybe(schema.arrayOf(schema.string())),
    },
    {
      validate: (v) => {
        if (!v.jobIds?.length && !v.groupIds?.length) {
          return 'List of job ids or group ids is required';
        }
      },
    }
  ),
});

export type MlAnomalyThresholdAlertParams = TypeOf<typeof mlAnomalyThresholdAlertParams>;
