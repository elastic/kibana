/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AddDataPanelProps } from '@kbn/observability-shared-plugin/public/components/add_data_panel';

export type AddMetricsCalloutKey =
  | 'hostOverview'
  | 'hostMetrics'
  | 'hostProcesses'
  | 'containerOverview'
  | 'containerMetrics';

const defaultPrimaryActionLabel = i18n.translate(
  'xpack.infra.addDataCallout.hostOverviewPrimaryActionLabel',
  {
    defaultMessage: 'Add Metrics',
  }
);

const defaultContent = {
  content: {
    title: i18n.translate('xpack.infra.addDataCallout.defaultTitle', {
      defaultMessage: 'View core metrics to understand your host performance',
    }),
    content: i18n.translate('xpack.infra.addDataCallout.defaultContent', {
      defaultMessage:
        'Collect metrics such as CPU and memory usage to identify performance bottlenecks that could be affecting your users.',
    }),
  },
};

const hostDefaultActions = (basePath: string) => {
  return {
    actions: {
      primary: {
        href: `${basePath}/app/observabilityOnboarding/?category=logs`,
        label: defaultPrimaryActionLabel,
      },
      secondary: {
        href: 'https://ela.st/demo-cluster-hosts',
      },
      link: {
        href: 'https://ela.st/docs-hosts-add-metrics',
      },
    },
  };
};

const containerDefaultActions = (basePath: string) => {
  return {
    actions: {
      primary: {
        href: `${basePath}/app/observabilityOnboarding/?category=infra`,
        label: defaultPrimaryActionLabel,
      },
      link: {
        href: 'https://ela.st/docs-containers-add-metrics',
      },
    },
  };
};

export const addMetricsCalloutDefinitions = (
  basePath: string
): Record<
  AddMetricsCalloutKey,
  Omit<AddDataPanelProps, 'onDismiss' | 'onAddData' | 'onLearnMore' | 'onTryIt'>
> => {
  return {
    hostOverview: {
      ...defaultContent,
      ...hostDefaultActions(basePath),
    },
    hostMetrics: {
      ...defaultContent,
      ...hostDefaultActions(basePath),
    },
    hostProcesses: {
      content: {
        title: i18n.translate('xpack.infra.addDataCallout.hostProcessesTitle', {
          defaultMessage: 'View host processes to identify performance bottlenecks',
        }),
        content: i18n.translate('xpack.infra.addDataCallout.hostProcessesContent', {
          defaultMessage:
            'Collect process data to understand what is consuming resource on your hosts.',
        }),
      },
      ...hostDefaultActions(basePath),
    },
    containerOverview: {
      ...defaultContent,
      ...containerDefaultActions(basePath),
    },
    containerMetrics: {
      ...defaultContent,
      ...containerDefaultActions(basePath),
    },
  };
};
