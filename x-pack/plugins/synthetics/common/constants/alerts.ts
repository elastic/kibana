/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionGroup } from '@kbn/alerting-plugin/common';

export type MonitorStatusActionGroup =
  ActionGroup<'xpack.synthetics.alerts.actionGroups.monitorStatus'>;
export type TLSLegacyActionGroup = ActionGroup<'xpack.synthetics.alerts.actionGroups.tls'>;
export type TLSActionGroup = ActionGroup<'xpack.synthetics.alerts.actionGroups.tlsCertificate'>;
export type DurationAnomalyActionGroup =
  ActionGroup<'xpack.synthetics.alerts.actionGroups.durationAnomaly'>;

export const MONITOR_STATUS: MonitorStatusActionGroup = {
  id: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
  name: 'Uptime Down Monitor',
};

export const TLS_LEGACY: TLSLegacyActionGroup = {
  id: 'xpack.synthetics.alerts.actionGroups.tls',
  name: 'Uptime TLS Alert (Legacy)',
};

export const TLS: TLSActionGroup = {
  id: 'xpack.synthetics.alerts.actionGroups.tlsCertificate',
  name: 'Uptime TLS Alert',
};

export const DURATION_ANOMALY: DurationAnomalyActionGroup = {
  id: 'xpack.synthetics.alerts.actionGroups.durationAnomaly',
  name: 'Uptime Duration Anomaly',
};

export const ACTION_GROUP_DEFINITIONS: {
  MONITOR_STATUS: MonitorStatusActionGroup;
  TLS_LEGACY: TLSLegacyActionGroup;
  TLS: TLSActionGroup;
  DURATION_ANOMALY: DurationAnomalyActionGroup;
} = {
  MONITOR_STATUS,
  TLS_LEGACY,
  TLS,
  DURATION_ANOMALY,
};

export const CLIENT_ALERT_TYPES = {
  MONITOR_STATUS: 'xpack.synthetics.alerts.monitorStatus',
  TLS_LEGACY: 'xpack.synthetics.alerts.tls',
  TLS: 'xpack.synthetics.alerts.tlsCertificate',
  DURATION_ANOMALY: 'xpack.synthetics.alerts.durationAnomaly',
};

export const UPTIME_RULE_TYPES = [
  'xpack.uptime.alerts.tls',
  'xpack.uptime.alerts.tlsCertificate',
  'xpack.uptime.alerts.monitorStatus',
  'xpack.uptime.alerts.durationAnomaly',
];
