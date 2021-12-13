/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RISK_SCORE } from '@kbn/rule-data-utils';

/** actions are disabled for these fields in tables and popovers */
export const FIELDS_WITHOUT_CELL_ACTIONS = [
  'signal.rule.risk_score',
  'signal.reason',
  ALERT_RISK_SCORE,
  'kibana.alert.reason',
];
