/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';
import { ISection } from '../../typings/section';

export const getEmptySections = ({ core }: { core: CoreStart }): ISection[] => {
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
      href: core.http.basePath.prepend('/app/home#/tutorial_directory/logging'),
    },
    {
      id: 'apm',
      title: i18n.translate('xpack.observability.emptySection.apps.apm.title', {
        defaultMessage: 'APM',
      }),
      icon: 'logoObservability',
      description: i18n.translate('xpack.observability.emptySection.apps.apm.description', {
        defaultMessage:
          'Trace transactions through a distributed architecture and map your services’ interactions to easily spot performance bottlenecks.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.apm.link', {
        defaultMessage: 'Install Agent',
      }),
      href: core.http.basePath.prepend('/app/home#/tutorial/apm'),
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
        defaultMessage: 'Install Metricbeat',
      }),
      href: core.http.basePath.prepend('/app/home#/tutorial_directory/metrics'),
    },
    {
      id: 'synthetics',
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
      href: core.http.basePath.prepend('/app/integrations/detail/synthetics/overview'),
    },
    {
      id: 'ux',
      title: i18n.translate('xpack.observability.emptySection.apps.ux.title', {
        defaultMessage: 'User Experience',
      }),
      icon: 'logoObservability',
      description: i18n.translate('xpack.observability.emptySection.apps.ux.description', {
        defaultMessage:
          'Performance is a distribution. Measure the experiences of all visitors to your web application and understand how to improve the experience for everyone.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.ux.link', {
        defaultMessage: 'Install RUM Agent',
      }),
      href: core.http.basePath.prepend('/app/home#/tutorial/apm'),
    },
    {
      id: 'alert',
      title: i18n.translate('xpack.observability.emptySection.apps.alert.title', {
        defaultMessage: 'No alerts found.',
      }),
      icon: 'watchesApp',
      description: i18n.translate('xpack.observability.emptySection.apps.alert.description', {
        defaultMessage:
          'Are 503 errors stacking up? Are services responding? Is CPU and RAM utilization jumping? See warnings as they happen—not as part of the post-mortem.',
      }),
      linkTitle: i18n.translate('xpack.observability.emptySection.apps.alert.link', {
        defaultMessage: 'Create rule',
      }),
      href: core.http.basePath.prepend(
        '/app/management/insightsAndAlerting/triggersActions/alerts'
      ),
    },
  ];
};
