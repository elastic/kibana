/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionGroup } from '@kbn/alerting-plugin/common';

export type MonitorStatusActionGroup =
  ActionGroup<'xpack.uptime.alerts.actionGroups.monitorStatus'>;
export type TLSLegacyActionGroup = ActionGroup<'xpack.uptime.alerts.actionGroups.tls'>;
export type TLSActionGroup = ActionGroup<'xpack.uptime.alerts.actionGroups.tlsCertificate'>;
export type DurationAnomalyActionGroup =
  ActionGroup<'xpack.uptime.alerts.actionGroups.durationAnomaly'>;

export const MONITOR_STATUS: MonitorStatusActionGroup = {
  id: 'xpack.uptime.alerts.actionGroups.monitorStatus',
  name: 'Uptime Down Monitor',
};

export const TLS_LEGACY: TLSLegacyActionGroup = {
  id: 'xpack.uptime.alerts.actionGroups.tls',
  name: 'Uptime TLS Alert (Legacy)',
};

export const TLS: TLSActionGroup = {
  id: 'xpack.uptime.alerts.actionGroups.tlsCertificate',
  name: 'Uptime TLS Alert',
};

export const DURATION_ANOMALY: DurationAnomalyActionGroup = {
  id: 'xpack.uptime.alerts.actionGroups.durationAnomaly',
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
  MONITOR_STATUS: 'xpack.uptime.alerts.monitorStatus',
  TLS_LEGACY: 'xpack.uptime.alerts.tls',
  TLS: 'xpack.uptime.alerts.tlsCertificate',
  DURATION_ANOMALY: 'xpack.uptime.alerts.durationAnomaly',
};
