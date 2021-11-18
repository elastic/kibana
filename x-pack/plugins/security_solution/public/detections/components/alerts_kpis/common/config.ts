/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertsStackByOption } from './types';

export const alertsStackByOptions: AlertsStackByOption[] = [
  { text: 'signal.rule.risk_score', value: 'signal.rule.risk_score' },
  { text: 'signal.rule.severity', value: 'signal.rule.severity' },
  { text: 'signal.rule.threat.tactic.name', value: 'signal.rule.threat.tactic.name' },
  { text: 'destination.ip', value: 'destination.ip' },
  { text: 'event.action', value: 'event.action' },
  { text: 'event.category', value: 'event.category' },
  { text: 'host.name', value: 'host.name' },
  { text: 'signal.rule.type', value: 'signal.rule.type' },
  { text: 'signal.rule.name', value: 'signal.rule.name' },
  { text: 'source.ip', value: 'source.ip' },
  { text: 'user.name', value: 'user.name' },
  { text: 'process.name', value: 'process.name' },
  { text: 'file.name', value: 'file.name' },
  { text: 'hash.sha256', value: 'hash.sha256' },
];

export const DEFAULT_STACK_BY_FIELD = 'signal.rule.name';

export const PANEL_HEIGHT = 300;
export const MOBILE_PANEL_HEIGHT = 500;
export const CHART_HEIGHT = 200;
