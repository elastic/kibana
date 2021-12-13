/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsStackByOption } from './types';

export const alertsStackByOptions: AlertsStackByOption[] = [
  { text: 'kibana.alert.risk_score', value: 'kibana.alert.risk_score' },
  { text: 'kibana.alert.severity', value: 'kibana.alert.severity' },
  { text: 'kibana.alert.rule.threat.tactic.name', value: 'kibana.alert.rule.threat.tactic.name' },
  { text: 'destination.ip', value: 'destination.ip' },
  { text: 'event.action', value: 'event.action' },
  { text: 'event.category', value: 'event.category' },
  { text: 'host.name', value: 'host.name' },
  { text: 'kibana.alert.rule.type', value: 'kibana.alert.rule.type' },
  { text: 'kibana.alert.rule.name', value: 'kibana.alert.rule.name' },
  { text: 'source.ip', value: 'source.ip' },
  { text: 'user.name', value: 'user.name' },
  { text: 'process.name', value: 'process.name' },
  { text: 'file.name', value: 'file.name' },
  { text: 'hash.sha256', value: 'hash.sha256' },
];

export const DEFAULT_STACK_BY_FIELD = 'kibana.alert.rule.name';

export const PANEL_HEIGHT = 300;
export const MOBILE_PANEL_HEIGHT = 500;
export const CHART_HEIGHT = 200;
