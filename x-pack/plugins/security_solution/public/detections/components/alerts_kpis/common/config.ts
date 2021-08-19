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
import type { AlertsStackByOption } from './types';
import { ALERT_RULE_THREAT_TACTIC_NAME } from '../../../../../../timelines/common/alerts';

export const alertsStackByOptions: AlertsStackByOption[] = [
  { text: ALERT_RULE_RISK_SCORE, value: ALERT_RULE_RISK_SCORE },
  { text: ALERT_RULE_SEVERITY, value: ALERT_RULE_SEVERITY },
  { text: ALERT_RULE_THREAT_TACTIC_NAME, value: ALERT_RULE_THREAT_TACTIC_NAME },
  { text: 'destination.ip', value: 'destination.ip' },
  { text: 'event.action', value: 'event.action' },
  { text: 'event.category', value: 'event.category' },
  { text: 'host.name', value: 'host.name' },
  { text: ALERT_RULE_TYPE, value: ALERT_RULE_TYPE },
  { text: ALERT_RULE_NAME, value: ALERT_RULE_NAME },
  { text: 'source.ip', value: 'source.ip' },
  { text: 'user.name', value: 'user.name' },
];

export const DEFAULT_STACK_BY_FIELD = ALERT_RULE_NAME;

export const PANEL_HEIGHT = 300;
export const MOBILE_PANEL_HEIGHT = 500;
export const CHART_HEIGHT = 200;
