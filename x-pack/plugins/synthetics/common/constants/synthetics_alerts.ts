/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionGroup } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';

export type MonitorStatusActionGroup =
  ActionGroup<'xpack.synthetics.alerts.actionGroups.monitorStatus'>;

export const MONITOR_STATUS: MonitorStatusActionGroup = {
  id: 'xpack.synthetics.alerts.actionGroups.monitorStatus',
  name: i18n.translate('xpack.synthetics.alertRules.actionGroups.monitorStatus', {
    defaultMessage: 'Synthetics monitor status',
  }),
};

export const ACTION_GROUP_DEFINITIONS: {
  MONITOR_STATUS: MonitorStatusActionGroup;
} = {
  MONITOR_STATUS,
};

export const SYNTHETICS_STATUS_RULE = 'xpack.synthetics.alerts.monitorStatus';

export const SYNTHETICS_ALERT_RULE_TYPES = {
  MONITOR_STATUS: SYNTHETICS_STATUS_RULE,
};

export const SYNTHETICS_RULE_TYPES = [SYNTHETICS_STATUS_RULE];
