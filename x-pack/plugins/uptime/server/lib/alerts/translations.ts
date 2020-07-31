/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const commonStateTranslations = [
  {
    name: 'firstCheckedAt',
    description: i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.state.firstCheckedAt',
      {
        defaultMessage: 'Timestamp indicating when this alert first checked',
      }
    ),
  },
  {
    name: 'firstTriggeredAt',
    description: i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.state.firstTriggeredAt',
      {
        defaultMessage: 'Timestamp indicating when the alert first triggered',
      }
    ),
  },
  {
    name: 'currentTriggerStarted',
    description: i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.state.currentTriggerStarted',
      {
        defaultMessage:
          'Timestamp indicating when the current trigger state began, if alert is triggered',
      }
    ),
  },
  {
    name: 'isTriggered',
    description: i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.state.isTriggered',
      {
        defaultMessage: `Flag indicating if the alert is currently triggering`,
      }
    ),
  },
  {
    name: 'lastCheckedAt',
    description: i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.state.lastCheckedAt',
      {
        defaultMessage: `Timestamp indicating the alert's most recent check time`,
      }
    ),
  },
  {
    name: 'lastResolvedAt',
    description: i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.state.lastResolvedAt',
      {
        defaultMessage: `Timestamp indicating the most recent resolution time for this alert`,
      }
    ),
  },
  {
    name: 'lastTriggeredAt',
    description: i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.state.lastTriggeredAt',
      {
        defaultMessage: `Timestamp indicating the alert's most recent trigger time`,
      }
    ),
  },
];

export const tlsTranslations = {
  alertFactoryName: i18n.translate('xpack.uptime.alerts.tls', {
    defaultMessage: 'Uptime TLS',
  }),
  actionVariables: [
    {
      name: 'count',
      description: i18n.translate('xpack.uptime.alerts.tls.actionVariables.state.count', {
        defaultMessage: 'The number of certs detected by the alert executor',
      }),
    },
    {
      name: 'expiringCount',
      description: i18n.translate('xpack.uptime.alerts.tls.actionVariables.state.expiringCount', {
        defaultMessage: 'The number of expiring certs detected by the alert.',
      }),
    },
    {
      name: 'expiringCommonNameAndDate',
      description: i18n.translate(
        'xpack.uptime.alerts.tls.actionVariables.state.expiringCommonNameAndDate',
        {
          defaultMessage: 'The common names and expiration date/time of the detected certs',
        }
      ),
    },
    {
      name: 'agingCount',
      description: i18n.translate('xpack.uptime.alerts.tls.actionVariables.state.agingCount', {
        defaultMessage: 'The number of detected certs that are becoming too old.',
      }),
    },
    {
      name: 'agingCommonNameAndDate',
      description: i18n.translate(
        'xpack.uptime.alerts.tls.actionVariables.state.agingCommonNameAndDate',
        {
          defaultMessage: 'The common names and expiration date/time of the detected certs.',
        }
      ),
    },
  ],
  validAfterExpiredString: (date: string, relativeDate: number) =>
    i18n.translate('xpack.uptime.alerts.tls.validAfterExpiredString', {
      defaultMessage: `expired on {date} {relativeDate} days ago.`,
      values: {
        date,
        relativeDate,
      },
    }),
  validAfterExpiringString: (date: string, relativeDate: number) =>
    i18n.translate('xpack.uptime.alerts.tls.validAfterExpiringString', {
      defaultMessage: `expires on {date} in {relativeDate} days.`,
      values: {
        date,
        relativeDate,
      },
    }),
  validBeforeExpiredString: (date: string, relativeDate: number) =>
    i18n.translate('xpack.uptime.alerts.tls.validBeforeExpiredString', {
      defaultMessage: 'valid since {date}, {relativeDate} days ago.',
      values: {
        date,
        relativeDate,
      },
    }),
  validBeforeExpiringString: (date: string, relativeDate: number) =>
    i18n.translate('xpack.uptime.alerts.tls.validBeforeExpiringString', {
      defaultMessage: 'invalid until {date}, {relativeDate} days from now.',
      values: {
        date,
        relativeDate,
      },
    }),
};

export const durationAnomalyTranslations = {
  alertFactoryName: i18n.translate('xpack.uptime.alerts.durationAnomaly', {
    defaultMessage: 'Uptime Duration Anomaly',
  }),
  actionVariables: [
    {
      name: 'severity',
      description: i18n.translate(
        'xpack.uptime.alerts.durationAnomaly.actionVariables.state.severity',
        {
          defaultMessage: 'The severity of the anomaly.',
        }
      ),
    },
    {
      name: 'anomalyStartTimestamp',
      description: i18n.translate(
        'xpack.uptime.alerts.durationAnomaly.actionVariables.state.anomalyStartTimestamp',
        {
          defaultMessage: 'ISO8601 timestamp of the start of the anomaly.',
        }
      ),
    },
    {
      name: 'monitor',
      description: i18n.translate(
        'xpack.uptime.alerts.durationAnomaly.actionVariables.state.monitor',
        {
          defaultMessage:
            'A human friendly rendering of name or ID, preferring name (e.g. My Monitor)',
        }
      ),
    },
    {
      name: 'monitorId',
      description: i18n.translate(
        'xpack.uptime.alerts.durationAnomaly.actionVariables.state.monitorId',
        {
          defaultMessage: 'ID of the monitor.',
        }
      ),
    },
    {
      name: 'monitorUrl',
      description: i18n.translate(
        'xpack.uptime.alerts.durationAnomaly.actionVariables.state.monitorUrl',
        {
          defaultMessage: 'URL of the monitor.',
        }
      ),
    },
    {
      name: 'slowestAnomalyResponse',
      description: i18n.translate(
        'xpack.uptime.alerts.durationAnomaly.actionVariables.state.slowestAnomalyResponse',
        {
          defaultMessage: 'Slowest response time during anomaly bucket with unit (ms, s) attached.',
        }
      ),
    },
    {
      name: 'expectedResponseTime',
      description: i18n.translate(
        'xpack.uptime.alerts.durationAnomaly.actionVariables.state.expectedResponseTime',
        {
          defaultMessage: 'Expected response time',
        }
      ),
    },
    {
      name: 'severityScore',
      description: i18n.translate(
        'xpack.uptime.alerts.durationAnomaly.actionVariables.state.severityScore',
        {
          defaultMessage: 'Anomaly severity score',
        }
      ),
    },
    {
      name: 'observerLocation',
      description: i18n.translate(
        'xpack.uptime.alerts.durationAnomaly.actionVariables.state.observerLocation',
        {
          defaultMessage: 'Observer location from which heartbeat check is performed.',
        }
      ),
    },
  ],
};
