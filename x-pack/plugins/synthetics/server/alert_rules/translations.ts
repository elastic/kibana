/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MonitorSummaryStatusRule } from './status_rule/types';

export const STATUS_RULE_NAME = i18n.translate('xpack.synthetics.alertRules.monitorStatus', {
  defaultMessage: 'Synthetics monitor status',
});

export const commonMonitorStateI18: Array<{
  name: keyof MonitorSummaryStatusRule;
  description: string;
}> = [
  {
    name: 'monitorName',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.monitor',
      {
        defaultMessage: 'Name of the monitor.',
      }
    ),
  },
  {
    name: 'monitorId',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.monitorId',
      {
        defaultMessage: 'ID of the monitor.',
      }
    ),
  },
  {
    name: 'monitorUrl',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.monitorUrl',
      {
        defaultMessage: 'URL of the monitor.',
      }
    ),
  },
  {
    name: 'monitorType',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.monitorType',
      {
        defaultMessage: 'Type (e.g. HTTP/TCP) of the monitor.',
      }
    ),
  },
  {
    name: 'status',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.status',
      {
        defaultMessage: 'Monitor status (e.g "down").',
      }
    ),
  },
  {
    name: 'lastErrorMessage',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.lastErrorMessage',
      {
        defaultMessage: 'Monitor last error message.',
      }
    ),
  },
  {
    name: 'locationName',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.locationName',
      {
        defaultMessage: 'Location name from which the check is performed.',
      }
    ),
  },
  {
    name: 'locationId',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.locationId',
      {
        defaultMessage: 'Location id from which the check is performed.',
      }
    ),
  },
  {
    name: 'hostName',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.observerHostname',
      {
        defaultMessage: 'Hostname of the location from which the check is performed.',
      }
    ),
  },
  {
    name: 'checkedAt',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.checkedAt',
      {
        defaultMessage: 'Timestamp of the monitor run.',
      }
    ),
  },
];

export const commonStateTranslations = [
  {
    name: 'firstCheckedAt',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.firstCheckedAt',
      {
        defaultMessage: 'Timestamp indicating when the alert was first checked.',
      }
    ),
  },
  {
    name: 'firstTriggeredAt',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.firstTriggeredAt',
      {
        defaultMessage: 'Timestamp indicating when the alert first triggered.',
      }
    ),
  },
  {
    name: 'isTriggered',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.isTriggered',
      {
        defaultMessage: `Flag indicating if the alert is currently triggering.`,
      }
    ),
  },
  {
    name: 'lastCheckedAt',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.lastCheckedAt',
      {
        defaultMessage: `Timestamp indicating the alert most recent check time.`,
      }
    ),
  },
  {
    name: 'lastResolvedAt',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.lastResolvedAt',
      {
        defaultMessage: `Timestamp indicating the most recent resolution time for this alert.`,
      }
    ),
  },
  {
    name: 'lastTriggeredAt',
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.state.lastTriggeredAt',
      {
        defaultMessage: `Timestamp indicating the alert most recent trigger time.`,
      }
    ),
  },
];
