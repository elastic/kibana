/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import { StackAlert } from '@kbn/alerts-as-data-utils';
import { ALERT_EVALUATION_VALUE } from '@kbn/rule-data-utils';
import { ALERT_NAMESPACE } from '@kbn/rule-data-utils';

export const STACK_AAD_INDEX_NAME = 'stack';

export const ALERT_TITLE = `${ALERT_NAMESPACE}.title` as const;
// kibana.alert.evaluation.conditions - human readable string that shows the conditions set by the user
export const ALERT_EVALUATION_CONDITIONS = `${ALERT_NAMESPACE}.evaluation.conditions` as const;

export const STACK_ALERTS_AAD_CONFIG: IRuleTypeAlerts<StackAlert> = {
  context: STACK_AAD_INDEX_NAME,
  mappings: {
    fieldMap: {
      [ALERT_TITLE]: { type: 'keyword', array: false, required: false },
      [ALERT_EVALUATION_CONDITIONS]: { type: 'keyword', array: false, required: false },
      [ALERT_EVALUATION_VALUE]: { type: 'keyword', array: false, required: false },
    },
  },
  shouldWrite: true,
};
