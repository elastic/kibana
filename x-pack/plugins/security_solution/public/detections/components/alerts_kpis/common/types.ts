/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_NAME,
  ALERT_RULE_RISK_SCORE,
  ALERT_RULE_SEVERITY,
  ALERT_RULE_TYPE,
} from '@kbn/rule-data-utils';
import { ALERT_RULE_THREAT_TACTIC_NAME } from '../../../../../../timelines/common/alerts';

export interface AlertsStackByOption {
  text: AlertsStackByField;
  value: AlertsStackByField;
}

export type AlertsStackByField =
  | typeof ALERT_RULE_RISK_SCORE
  | typeof ALERT_RULE_SEVERITY
  | typeof ALERT_RULE_THREAT_TACTIC_NAME
  | 'destination.ip'
  | 'event.action'
  | 'event.category'
  | 'host.name'
  | typeof ALERT_RULE_TYPE
  | typeof ALERT_RULE_NAME
  | 'source.ip'
  | 'user.name';
