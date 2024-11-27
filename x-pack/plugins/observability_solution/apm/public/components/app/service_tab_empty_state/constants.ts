/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AddDataPanelProps } from '@kbn/observability-shared-plugin/public';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import {
  ApmOnboardingLocatorCategory,
  ApmOnboardingLocatorParams,
} from '../../../locator/onboarding_locator';

export type AddAPMCalloutKeys =
  | 'serviceOverview'
  | 'serviceDependencies'
  | 'infraOverview'
  | 'serviceMap'
  | 'transactionOverview'
  | 'metrics'
  | 'errorGroupOverview';

const defaultActions = (locator: LocatorPublic<ApmOnboardingLocatorParams> | undefined) => {
  return {
    actions: {
      primary: {
        href: locator?.getRedirectUrl({ category: ApmOnboardingLocatorCategory.Apm }),
        label: i18n.translate('xpack.apm.serviceTabEmptyState.defaultPrimaryActionLabel', {
          defaultMessage: 'Add APM',
        }),
      },
      secondary: {
        href: 'https://ela.st/demo-apm-try-it',
      },
      link: {
        href: 'https://www.elastic.co/observability/application-performance-monitoring',
      },
    },
  };
};

export const addAPMCalloutDefinitions = (
  baseFolderPath: string,
  locator: LocatorPublic<ApmOnboardingLocatorParams> | undefined
): Record<
  AddAPMCalloutKeys,
  Omit<AddDataPanelProps, 'onDismiss' | 'onAddData' | 'onLearnMore' | 'onTryIt'>
> => {
  return {
    serviceOverview: {
      content: {
        title: i18n.translate('xpack.apm.serviceTabEmptyState.overviewTitle', {
          defaultMessage:
            'Detect and resolve issues faster with deep visibility into your application',
        }),
        content: i18n.translate('xpack.apm.serviceTabEmptyState.overviewContent', {
          defaultMessage:
            'Understanding your application performance, relationships and dependencies by instrumenting with APM.',
        }),
        img: {
          name: 'service_tab_empty_state_overview.png',
          baseFolderPath,
          position: 'inside',
        },
      },
      ...defaultActions(locator),
    },
    serviceDependencies: {
      content: {
        title: i18n.translate('xpack.apm.serviceTabEmptyState.dependenciesTitle', {
          defaultMessage: 'Understand the dependencies for your service',
        }),
        content: i18n.translate('xpack.apm.serviceTabEmptyState.dependenciesContent', {
          defaultMessage:
            "See your service's dependencies on both internal and third-party services by instrumenting with APM.",
        }),
        img: {
          name: 'service_tab_empty_state_dependencies.png',
          baseFolderPath,
          position: 'below',
        },
      },
      ...defaultActions(locator),
    },
    infraOverview: {
      content: {
        title: i18n.translate('xpack.apm.serviceTabEmptyState.infrastructureTitle', {
          defaultMessage: 'Understand what your service is running on',
        }),
        content: i18n.translate('xpack.apm.serviceTabEmptyState.infrastructureContent', {
          defaultMessage:
            'Troubleshoot service problems by seeing the infrastructure your service is running on.',
        }),
        img: {
          name: 'service_tab_empty_state_infrastructure.png',
          baseFolderPath,
          position: 'below',
        },
      },
      ...defaultActions(locator),
    },
    serviceMap: {
      content: {
        title: i18n.translate('xpack.apm.serviceTabEmptyState.serviceMapTitle', {
          defaultMessage: 'Visualise the dependencies between your services',
        }),
        content: i18n.translate('xpack.apm.serviceTabEmptyState.serviceMapContent', {
          defaultMessage:
            'See your services dependencies at a glance to help identify dependencies that may be affecting your service.',
        }),
        img: {
          name: 'service_tab_empty_state_service_map.png',
          baseFolderPath,
          position: 'below',
        },
      },
      ...defaultActions(locator),
    },
    transactionOverview: {
      content: {
        title: i18n.translate('xpack.apm.serviceTabEmptyState.transactionsTitle', {
          defaultMessage: 'Troubleshoot latency, throughput and errors',
        }),
        content: i18n.translate('xpack.apm.serviceTabEmptyState.transactionsContent', {
          defaultMessage:
            "Troubleshoot your service's performance by analysing latency, throughput and errors down to the specific transaction.",
        }),
        img: {
          name: 'service_tab_empty_state_transactions.png',
          baseFolderPath,
          position: 'below',
        },
      },
      ...defaultActions(locator),
    },
    metrics: {
      content: {
        title: i18n.translate('xpack.apm.serviceTabEmptyState.metricsTitle', {
          defaultMessage: 'View core metrics for your application',
        }),
        content: i18n.translate('xpack.apm.serviceTabEmptyState.metricsContent', {
          defaultMessage:
            'View metric trends for the instances of your service to identify performance bottlenecks that could be affecting your users.',
        }),
        img: {
          name: 'service_tab_empty_state_metrics.png',
          baseFolderPath,
          position: 'below',
        },
      },
      ...defaultActions(locator),
    },
    errorGroupOverview: {
      content: {
        title: i18n.translate('xpack.apm.serviceTabEmptyState.errorGroupOverviewTitle', {
          defaultMessage: 'Identify transaction errors with your applications',
        }),
        content: i18n.translate('xpack.apm.serviceTabEmptyState.errorGroupOverviewContent', {
          defaultMessage:
            'Analyse errors down to the specific transaction to pin-point specific errors within your service.',
        }),
        img: {
          name: 'service_tab_empty_state_errors.png',
          baseFolderPath,
          position: 'below',
        },
      },
      ...defaultActions(locator),
    },
  };
};
