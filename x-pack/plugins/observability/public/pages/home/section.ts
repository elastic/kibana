/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { ObservabilityApp } from '../../../typings/common';

export interface ISection {
  id: ObservabilityApp;
  title: string;
  icon: string;
  description: string;
  href?: string;
  linkTitle?: string;
  target?: '_blank';
}

export const appsSection: ISection[] = [
  {
    id: 'infra_logs',
    title: i18n.translate('xpack.observability.section.apps.logs.title', {
      defaultMessage: 'Logs',
    }),
    icon: 'logoLogging',
    description: i18n.translate('xpack.observability.section.apps.logs.description', {
      defaultMessage:
        'Centralize logs from any source. Search, tail, automate anomaly detection, and visualize trends so you can take action quicker.',
    }),
    linkTitle: i18n.translate('xpack.observability.section.apps.logs.link', {
      defaultMessage: 'Install Filebeat',
    }),
    href: 'https://www.elastic.co',
  },
  {
    id: 'apm',
    title: i18n.translate('xpack.observability.section.apps.apm.title', {
      defaultMessage: 'APM',
    }),
    icon: 'logoAPM',
    description: i18n.translate('xpack.observability.section.apps.apm.description', {
      defaultMessage:
        'Trace transactions through a distributed architecture and map your services’ interactions to easily spot performance bottlenecks.',
    }),
    linkTitle: i18n.translate('xpack.observability.section.apps.apm.link', {
      defaultMessage: 'Install agent',
    }),
    href: 'https://www.elastic.co',
  },
  {
    id: 'infra_metrics',
    title: i18n.translate('xpack.observability.section.apps.metrics.title', {
      defaultMessage: 'Metrics',
    }),
    icon: 'logoMetrics',
    description: i18n.translate('xpack.observability.section.apps.metrics.description', {
      defaultMessage:
        'Analyze metrics from your infrastructure, apps, and services. Discover trends, forecast behavior, get alerts on anomalies, and more.',
    }),
    linkTitle: i18n.translate('xpack.observability.section.apps.metrics.link', {
      defaultMessage: 'Install metrics module',
    }),
    href: 'https://www.elastic.co',
  },
  {
    id: 'uptime',
    title: i18n.translate('xpack.observability.section.apps.uptime.title', {
      defaultMessage: 'Uptime',
    }),
    icon: 'logoUptime',
    description: i18n.translate('xpack.observability.section.apps.uptime.description', {
      defaultMessage:
        'Proactively monitor the availability of your sites and services. Receive alerts and resolve issues faster to optimize your users’ experience.',
    }),
    linkTitle: i18n.translate('xpack.observability.section.apps.uptime.link', {
      defaultMessage: 'Install Heartbeat',
    }),
    href: 'https://www.elastic.co',
  },
];
