/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HttpSetup } from '@kbn/core/public';
import { ISection } from '../../typings/section';

export const getEmptySections = ({ http }: { http: HttpSetup }): ISection[] => {
  return [
    {
      id: 'infra_logs',
      title: i18n.translate('xpack.observability.emptySection.apps.logs.title', {
        defaultMessage: 'Logs',
      }),
      icon: 'logoLogging',
      description: i18n.translate('xpack.observability.emptySection.apps.logs.description', {
        defaultMessage:
          'Fast, easy, and scalable centralized log monitoring with out-of-the-box support for common data sources.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.logs.link', {
        defaultMessage: 'Install Filebeat',
      }),
      href: http.basePath.prepend('/app/home#/tutorial_directory/logging'),
    },
    {
      id: 'apm',
      title: i18n.translate('xpack.observability.emptySection.apps.apm.title', {
        defaultMessage: 'APM',
      }),
      icon: 'logoObservability',
      description: i18n.translate('xpack.observability.emptySection.apps.apm.description', {
        defaultMessage:
          'Get deeper visibility into your applications with extensive support for popular languages, OpenTelemetry, and distributed tracing.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.apm.link', {
        defaultMessage: 'Install Agent',
      }),
      href: http.basePath.prepend('/app/home#/tutorial/apm'),
    },
    {
      id: 'infra_metrics',
      title: i18n.translate('xpack.observability.emptySection.apps.metrics.title', {
        defaultMessage: 'Metrics',
      }),
      icon: 'logoMetrics',
      description: i18n.translate('xpack.observability.emptySection.apps.metrics.description', {
        defaultMessage: 'Stream, visualize, and analyze your infrastructure metrics.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.metrics.link', {
        defaultMessage: 'Install Metricbeat',
      }),
      href: http.basePath.prepend('/app/home#/tutorial_directory/metrics'),
    },
    {
      id: 'synthetics',
      title: i18n.translate('xpack.observability.emptySection.apps.uptime.title', {
        defaultMessage: 'Uptime',
      }),
      icon: 'logoUptime',
      description: i18n.translate('xpack.observability.emptySection.apps.uptime.description', {
        defaultMessage: 'Proactively monitor the availability and functionality of user journeys.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.uptime.link', {
        defaultMessage: 'Install Heartbeat',
      }),
      href: http.basePath.prepend('/app/home#/tutorial/uptimeMonitors'),
    },
    {
      id: 'ux',
      title: i18n.translate('xpack.observability.emptySection.apps.ux.title', {
        defaultMessage: 'User Experience',
      }),
      icon: 'logoObservability',
      description: i18n.translate('xpack.observability.emptySection.apps.ux.description', {
        defaultMessage:
          'Collect, measure, and analyze performance data that reflects real-world user experiences.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.ux.link', {
        defaultMessage: 'Install RUM Agent',
      }),
      href: http.basePath.prepend('/app/home#/tutorial/apm'),
    },
    {
      id: 'alert',
      title: i18n.translate('xpack.observability.emptySection.apps.alert.title', {
        defaultMessage: 'No alerts found.',
      }),
      icon: 'watchesApp',
      description: i18n.translate('xpack.observability.emptySection.apps.alert.description', {
        defaultMessage:
          'Detect complex conditions within Observability and trigger actions when those conditions are met.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.alert.link', {
        defaultMessage: 'Create rule',
      }),
      href: http.basePath.prepend('/app/management/insightsAndAlerting/triggersActions/alerts'),
    },
  ];
};
