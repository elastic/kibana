/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { HttpSetup, DocLinksStart } from 'kibana/public';
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

export const getContent = (
  http: HttpSetup,
  docLinks: DocLinksStart
): ObservabilityStatusContent[] => {
  return [
    {
      id: 'infra_logs',
      title: i18n.translate('xpack.observability.statusVisualization.logs.title', {
        defaultMessage: 'Logs',
      }),
      description: i18n.translate('xpack.observability.statusVisualization.logs.description', {
        defaultMessage:
          'Fast, easy, and scalable centralized log monitoring with out-of-the-box support for common data sources.',
      }),
      addTitle: i18n.translate('xpack.observability.statusVisualization.logs.link', {
        defaultMessage: 'Add integrations',
      }),
      addLink: http.basePath.prepend('/app/integrations/browse?q=logs'),
      learnMoreLink: docLinks.links.observability.monitorLogs,
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
      learnMoreLink: docLinks.links.apm.overview,
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
      learnMoreLink: docLinks.links.observability.analyzeMetrics,
      goToAppTitle: i18n.translate('xpack.observability.statusVisualization.metrics.goToAppTitle', {
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
      learnMoreLink: docLinks.links.observability.monitorUptimeSynthetics,
      goToAppTitle: i18n.translate('xpack.observability.statusVisualization.uptime.goToAppTitle', {
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
      learnMoreLink: docLinks.links.observability.userExperience,
      goToAppTitle: i18n.translate('xpack.observability.statusVisualization.ux.goToAppTitle', {
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
          'Detect complex conditions in Observability and trigger actions when those conditions are met.',
      }),
      addTitle: i18n.translate('xpack.observability.statusVisualization.alert.link', {
        defaultMessage: 'Create rules',
      }),
      addLink: http.basePath.prepend('/app/management/insightsAndAlerting/triggersActions/rules'),
      learnMoreLink: docLinks.links.observability.createAlerts,
      goToAppTitle: i18n.translate('xpack.observability.statusVisualization.alert.goToAppTitle', {
        defaultMessage: 'Show alerts',
      }),
      goToAppLink: http.basePath.prepend('/app/observability/alerts'),
    },
  ];
};
