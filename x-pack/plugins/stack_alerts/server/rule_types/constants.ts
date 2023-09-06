/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import { StackAlert } from '@kbn/alerts-as-data-utils';
import { ALERT_EVALUATION_VALUE } from '@kbn/rule-data-utils';
import { ALERT_EVALUATION_CONDITIONS, ALERT_TITLE } from './es_query/fields';

export const STACK_AAD_INDEX_NAME = 'stack';

export const stackAlertsAADConfig: IRuleTypeAlerts<StackAlert> = {
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
