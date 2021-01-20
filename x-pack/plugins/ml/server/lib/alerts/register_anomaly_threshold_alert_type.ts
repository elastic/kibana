/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { ML_ALERT_TYPES, ML_ALERT_TYPES_CONFIG } from '../../../common/constants/alerts';
import { AlertingPlugin } from '../../../../alerts/server';
import { PLUGIN_ID } from '../../../common/constants/app';

const paramsSchema = schema.object({
  serviceName: schema.string(),
  transactionType: schema.string(),
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  aggregationType: schema.oneOf([
    schema.literal('avg'),
    schema.literal('95th'),
    schema.literal('99th'),
  ]),
  environment: schema.string(),
});

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
      params: paramsSchema,
    },
    actionVariables: {
      context: [],
    },
    producer: PLUGIN_ID,
    minimumLicenseRequired: 'platinum',
    executor: async ({ services, params }) => {},
  });
}
