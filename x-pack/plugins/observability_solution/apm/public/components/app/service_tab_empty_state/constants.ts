/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type EmptyStateKey =
  | 'serviceOverview'
  | 'serviceDependencies'
  | 'infraOverview'
  | 'serviceMap'
  | 'transactionOverview'
  | 'metrics'
  | 'errorGroupOverview';

interface EmptyStateContent {
  title: string;
  content: string;
  imgName?: string;
}

export const emptyStateDefinitions: Record<EmptyStateKey, EmptyStateContent> = {
  serviceOverview: {
    title: i18n.translate('xpack.apm.serviceTabEmptyState.overviewTitle', {
      defaultMessage: 'Detect and resolve issues faster with deep visibility into your application',
    }),
    content: i18n.translate('xpack.apm.serviceTabEmptyState.overviewContent', {
      defaultMessage:
        'Understanding your application performance, relationships and dependencies by instrumenting with APM.',
    }),
  },
  serviceDependencies: {
    title: i18n.translate('xpack.apm.serviceTabEmptyState.dependenciesTitle', {
      defaultMessage: 'Understand the dependencies for your service',
    }),
    content: i18n.translate('xpack.apm.serviceTabEmptyState.dependenciesContent', {
      defaultMessage:
        'See your services dependencies on both internal and third-party services by instrumenting with APM.',
    }),
    imgName: 'service_tab_empty_state_dependencies.png',
  },
  infraOverview: {
    title: i18n.translate('xpack.apm.serviceTabEmptyState.infrastructureTitle', {
      defaultMessage: 'Understand what your service is running on',
    }),
    content: i18n.translate('xpack.apm.serviceTabEmptyState.infrastructureContent', {
      defaultMessage:
        'Troubleshoot service problems by seeing the infrastructure your service is running on.',
    }),
    imgName: 'service_tab_empty_state_infrastructure.png',
  },
  serviceMap: {
    title: i18n.translate('xpack.apm.serviceTabEmptyState.serviceMapTitle', {
      defaultMessage: 'Visualise the dependencies between your services',
    }),
    content: i18n.translate('xpack.apm.serviceTabEmptyState.serviceMapContent', {
      defaultMessage:
        'See your services dependencies at a glance to help identify dependencies that may be affecting your service.',
    }),
    imgName: 'service_tab_empty_state_service_map.png',
  },
  transactionOverview: {
    title: i18n.translate('xpack.apm.serviceTabEmptyState.transactionsTitle', {
      defaultMessage: 'Troubleshoot latency, throughput and errors',
    }),
    content: i18n.translate('xpack.apm.serviceTabEmptyState.transactionsContent', {
      defaultMessage:
        "Troubleshoot your service's performance by analysing latency, throughput and errors down to the specific transaction.",
    }),
    imgName: 'service_tab_empty_state_transactions.png',
  },
  metrics: {
    title: i18n.translate('xpack.apm.serviceTabEmptyState.metricsTitle', {
      defaultMessage: 'View core metrics for your application',
    }),
    content: i18n.translate('xpack.apm.serviceTabEmptyState.metricsContent', {
      defaultMessage:
        'View metric trends for the instances of your service to identify performance bottlenecks that could be affecting your users.',
    }),
    imgName: 'service_tab_empty_state_metrics.png',
  },
  errorGroupOverview: {
    title: i18n.translate('xpack.apm.serviceTabEmptyState.errorGroupOverviewTitle', {
      defaultMessage: 'Identify transaction errors with your applications',
    }),
    content: i18n.translate('xpack.apm.serviceTabEmptyState.errorGroupOverviewContent', {
      defaultMessage:
        'Analyse errors down to the specific transaction to pin-point specific errors within your service.',
    }),
    imgName: 'service_tab_empty_state_errors.png',
  },
};
