/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ML_ALERT_TYPES,
  ML_ALERT_TYPES_CONFIG,
  mlAnomalyThresholdAlertParams,
} from '../../../common/constants/alerts';
import { AlertingPlugin } from '../../../../alerts/server';
import { PLUGIN_ID } from '../../../common/constants/app';
import { MINIMUM_FULL_LICENSE } from '../../../common/license';

const alertTypeConfig = ML_ALERT_TYPES_CONFIG[ML_ALERT_TYPES.ANOMALY_THRESHOLD];

interface RegisterAlertParams {
  alerts: AlertingPlugin['setup'];
}

export function registerAnomalyThresholdAlertType({ alerts }: RegisterAlertParams) {
  alerts.registerType({
    id: ML_ALERT_TYPES.ANOMALY_THRESHOLD,
    name: alertTypeConfig.name,
    actionGroups: alertTypeConfig.actionGroups,
    defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
    validate: {
      params: mlAnomalyThresholdAlertParams,
    },
    actionVariables: {
      context: [],
    },
    producer: PLUGIN_ID,
    minimumLicenseRequired: MINIMUM_FULL_LICENSE,
    executor: async ({ services, params }) => {},
  });
}
