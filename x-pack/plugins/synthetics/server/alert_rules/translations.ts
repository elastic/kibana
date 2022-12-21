/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STATUS_RULE_NAME = i18n.translate('xpack.synthetics.alertRules.monitorStatus', {
  defaultMessage: 'Synthetics monitor status',
});

export const commonMonitorStateI18 = [
  {
    name: 'monitorName',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.monitor',
      {
        defaultMessage:
          'A human friendly rendering of name or ID, preferring name (e.g. My Monitor)',
      }
    ),
  },
  {
    name: 'monitorId',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.monitorId',
      {
        defaultMessage: 'ID of the monitor.',
      }
    ),
  },
  {
    name: 'monitorUrl',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.monitorUrl',
      {
        defaultMessage: 'URL of the monitor.',
      }
    ),
  },
  {
    name: 'monitorType',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.monitorType',
      {
        defaultMessage: 'Type (e.g. HTTP/TCP) of the monitor.',
      }
    ),
  },
  {
    name: 'statusMessage',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.statusMessage',
      {
        defaultMessage:
          'Status message e.g down or is below availability threshold in case of availability check or both.',
      }
    ),
  },
  {
    name: 'latestErrorMessage',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.lastErrorMessage',
      {
        defaultMessage: 'Monitor latest error message',
      }
    ),
  },
  {
    name: 'observerLocation',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.observerLocation',
      {
        defaultMessage: 'Observer location from which heartbeat check is performed.',
      }
    ),
  },
  {
    name: 'observerHostname',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.observerHostname',
      {
        defaultMessage: 'Observer hostname from which heartbeat check is performed.',
      }
    ),
  },
];

export const commonStateTranslations = [
  {
    name: 'firstCheckedAt',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.firstCheckedAt',
      {
        defaultMessage: 'Timestamp indicating when this alert first checked',
      }
    ),
  },
  {
    name: 'firstTriggeredAt',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.firstTriggeredAt',
      {
        defaultMessage: 'Timestamp indicating when the alert first triggered',
      }
    ),
  },
  {
    name: 'currentTriggerStarted',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.currentTriggerStarted',
      {
        defaultMessage:
          'Timestamp indicating when the current trigger state began, if alert is triggered',
      }
    ),
  },
  {
    name: 'isTriggered',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.isTriggered',
      {
        defaultMessage: `Flag indicating if the alert is currently triggering`,
      }
    ),
  },
  {
    name: 'lastCheckedAt',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.lastCheckedAt',
      {
        defaultMessage: `Timestamp indicating the alert's most recent check time`,
      }
    ),
  },
  {
    name: 'lastResolvedAt',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.lastResolvedAt',
      {
        defaultMessage: `Timestamp indicating the most recent resolution time for this alert`,
      }
    ),
  },
  {
    name: 'lastTriggeredAt',
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.state.lastTriggeredAt',
      {
        defaultMessage: `Timestamp indicating the alert's most recent trigger time`,
      }
    ),
  },
];
