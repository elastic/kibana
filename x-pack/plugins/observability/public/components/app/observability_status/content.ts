/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { HttpSetup } from 'kibana/public';
import { ObservabilityFetchDataPlugins } from '../../../typings/fetch_overview_data';

export interface ObservabilityStatusContent {
  id: ObservabilityFetchDataPlugins | 'alert';
  title: string;
  description: string;
  addTitle: string;
  addLink: string;
  learnMoreLink: string;
  goToAppTitle: string;
  goToAppLink: string;
}

export const getContent = ({ http }: { http: HttpSetup }): ObservabilityStatusContent[] => {
  return [
    {
      id: 'infra_logs',
      title: i18n.translate('xpack.observability.statusVisualization.logs.title', {
        defaultMessage: 'Logs',
      }),
      description: i18n.translate('xpack.observability.statusVisualization.logs.description', {
        defaultMessage:
          'Fast, easy, and scalable, centralized log monitoring with out-of-the-box support for common data sources.',
      }),
      addTitle: i18n.translate('xpack.observability.statusVisualization.logs.link', {
        defaultMessage: 'Add integrations',
      }),
      addLink: http.basePath.prepend('/app/integrations/browse?q=logs'),
      learnMoreLink: 'https://www.elastic.co/guide/en/observability/current/monitor-logs.html',
      goToAppTitle: i18n.translate('xpack.observability.statusVisualization.logs.goToAppTitle', {
        defaultMessage: 'Show log stream',
      }),
      goToAppLink: http.basePath.prepend('/app/logs/stream'),
    },
    {
      id: 'apm',
      title: i18n.translate('xpack.observability.statusVisualization.apm.title', {
        defaultMessage: 'APM',
      }),
      description: i18n.translate('xpack.observability.statusVisualization.apm.description', {
        defaultMessage:
          'Get deeper visibility into your applications with extensive support for popular languages, OpenTelemetry, and distributed tracing.',
      }),
      addTitle: i18n.translate('xpack.observability.statusVisualization.apm.link', {
        defaultMessage: 'Add data',
      }),
      addLink: http.basePath.prepend('/app/home#/tutorial/apm'),
      learnMoreLink: 'https://www.elastic.co/guide/en/apm/guide/current/apm-overview.html',
      goToAppTitle: i18n.translate('xpack.observability.statusVisualization.apm.goToAppTitle', {
        defaultMessage: 'Show services inventory',
      }),
      goToAppLink: http.basePath.prepend('/app/apm/services'),
    },
    {
      id: 'infra_metrics',
      title: i18n.translate('xpack.observability.statusVisualization.metrics.title', {
        defaultMessage: 'Infrastructure',
      }),
      description: i18n.translate('xpack.observability.statusVisualization.metrics.description', {
        defaultMessage: 'Stream, visualize, and analyze your infrastructure metrics.',
      }),
      addTitle: i18n.translate('xpack.observability.statusVisualization.metrics.link', {
        defaultMessage: 'Add integrations',
      }),
      addLink: http.basePath.prepend('/app/integrations/browse?q=metrics'),
      learnMoreLink: 'https://www.elastic.co/guide/en/observability/current/analyze-metrics.html',
      goToAppTitle: i18n.translate('xpack.observability.statusVisualization.apm.goToAppTitle', {
        defaultMessage: 'Show inventory',
      }),
      goToAppLink: http.basePath.prepend('/app/metrics/inventory'),
    },
    {
      id: 'synthetics',
      title: i18n.translate('xpack.observability.statusVisualization.uptime.title', {
        defaultMessage: 'Uptime',
      }),
      description: i18n.translate('xpack.observability.statusVisualization.uptime.description', {
        defaultMessage: 'Proactively monitor the availability and functionality of user journeys.',
      }),
      addTitle: i18n.translate('xpack.observability.statusVisualization.uptime.link', {
        defaultMessage: 'Add monitors',
      }),
      addLink: http.basePath.prepend('/app/home#/tutorial/uptimeMonitors'),
      learnMoreLink:
        'https://www.elastic.co/guide/en/observability/current/monitor-uptime-synthetics.html',
      goToAppTitle: i18n.translate('xpack.observability.statusVisualization.apm.goToAppTitle', {
        defaultMessage: 'Show monitors ',
      }),
      goToAppLink: http.basePath.prepend('/app/uptime'),
    },
    {
      id: 'ux',
      title: i18n.translate('xpack.observability.statusVisualization.ux.title', {
        defaultMessage: 'User Experience',
      }),
      description: i18n.translate('xpack.observability.statusVisualization.ux.description', {
        defaultMessage:
          'Collect, measure, and analyze performance data that reflects real-world user experiences.',
      }),
      addTitle: i18n.translate('xpack.observability.statusVisualization.ux.link', {
        defaultMessage: 'Add data',
      }),
      addLink: http.basePath.prepend('/app/home#/tutorial/apm'),
      learnMoreLink: 'https://www.elastic.co/guide/en/observability/current/user-experience.html',
      goToAppTitle: i18n.translate('xpack.observability.statusVisualization.apm.goToAppTitle', {
        defaultMessage: 'Show dashboard',
      }),
      goToAppLink: http.basePath.prepend('/app/ux'),
    },
    {
      id: 'alert',
      title: i18n.translate('xpack.observability.statusVisualization.alert.title', {
        defaultMessage: 'Alerting',
      }),
      description: i18n.translate('xpack.observability.statusVisualization.alert.description', {
        defaultMessage:
          'Detect complex conditions within Observability and trigger actions when those conditions are met.',
      }),
      addTitle: i18n.translate('xpack.observability.statusVisualization.alert.link', {
        defaultMessage: 'Create rules',
      }),
      addLink: http.basePath.prepend('/app/management/insightsAndAlerting/triggersActions/rules'),
      learnMoreLink: 'https://www.elastic.co/guide/en/observability/current/create-alerts.html',
      goToAppTitle: i18n.translate('xpack.observability.statusVisualization.apm.goToAppTitle', {
        defaultMessage: 'Show alerts',
      }),
      goToAppLink: http.basePath.prepend('/app/observability/alerts'),
    },
  ];
};
