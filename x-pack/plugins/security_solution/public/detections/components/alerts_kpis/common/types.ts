/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface AlertsStackByOption {
  text: AlertsStackByField;
  value: AlertsStackByField;
}

export type AlertsStackByField =
  | 'kibana.alert.risk_score'
  | 'kibana.alert.severity'
  | 'kibana.alert.rule.threat.tactic.name'
  | 'destination.ip'
  | 'event.action'
  | 'event.category'
  | 'host.name'
  | 'kibana.alert.rule.type'
  | 'kibana.alert.rule.name'
  | 'source.ip'
  | 'user.name'
  | 'process.name'
  | 'file.name'
  | 'hash.sha256';
