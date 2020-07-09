/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { AppMountContext } from 'kibana/public';
import { ISection } from '../../typings/section';

export const getEmptySections = ({ core }: { core: AppMountContext['core'] }): ISection[] => {
  return [
    {
      id: 'infra_logs',
      title: i18n.translate('xpack.observability.emptySection.apps.logs.title', {
        defaultMessage: 'Logs',
      }),
      icon: 'logoLogging',
      description: i18n.translate('xpack.observability.emptySection.apps.logs.description', {
        defaultMessage:
          'Centralize logs from any source. Search, tail, automate anomaly detection, and visualize trends so you can take action quicker.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.logs.link', {
        defaultMessage: 'Install Filebeat',
      }),
      href: 'https://www.elastic.co',
    },
    {
      id: 'apm',
      title: i18n.translate('xpack.observability.emptySection.apps.apm.title', {
        defaultMessage: 'APM',
      }),
      icon: 'logoAPM',
      description: i18n.translate('xpack.observability.emptySection.apps.apm.description', {
        defaultMessage:
          'Trace transactions through a distributed architecture and map your services’ interactions to easily spot performance bottlenecks.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.apm.link', {
        defaultMessage: 'Install agent',
      }),
      href: 'https://www.elastic.co',
    },
    {
      id: 'infra_metrics',
      title: i18n.translate('xpack.observability.emptySection.apps.metrics.title', {
        defaultMessage: 'Metrics',
      }),
      icon: 'logoMetrics',
      description: i18n.translate('xpack.observability.emptySection.apps.metrics.description', {
        defaultMessage:
          'Analyze metrics from your infrastructure, apps, and services. Discover trends, forecast behavior, get alerts on anomalies, and more.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.metrics.link', {
        defaultMessage: 'Install metrics module',
      }),
      href: 'https://www.elastic.co',
    },
    {
      id: 'uptime',
      title: i18n.translate('xpack.observability.emptySection.apps.uptime.title', {
        defaultMessage: 'Uptime',
      }),
      icon: 'logoUptime',
      description: i18n.translate('xpack.observability.emptySection.apps.uptime.description', {
        defaultMessage:
          'Proactively monitor the availability of your sites and services. Receive alerts and resolve issues faster to optimize your users’ experience.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.uptime.link', {
        defaultMessage: 'Install Heartbeat',
      }),
      href: 'https://www.elastic.co',
    },
    {
      id: 'alert',
      title: i18n.translate('xpack.observability.emptySection.apps.alert.title', {
        defaultMessage: 'No alerts found.',
      }),
      icon: 'watchesApp',
      description: i18n.translate('xpack.observability.emptySection.apps.alert.description', {
        defaultMessage:
          '503 errors stacking up. Applications not responding. CPU and RAM utilization jumping. See these warnings as they happen - not as part of the post-mortem.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.alert.link', {
        defaultMessage: 'Create alert',
      }),
      href: core.http.basePath.prepend(
        '/app/management/insightsAndAlerting/triggersActions/alerts'
      ),
    },
  ];
};
