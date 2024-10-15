/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { AddDataPanelProps } from '@kbn/observability-shared-plugin/public';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { OnboardingFlow } from '../../shared/templates/no_data_config';

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

const hostDefaultActions = (
  locator: LocatorPublic<ObservabilityOnboardingLocatorParams> | undefined
) => {
  return {
    actions: {
      primary: {
        href: locator?.getRedirectUrl({ category: OnboardingFlow.Hosts }),
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

const containerDefaultActions = (
  locator: LocatorPublic<ObservabilityOnboardingLocatorParams> | undefined
) => {
  return {
    actions: {
      primary: {
        href: locator?.getRedirectUrl({ category: OnboardingFlow.Infra }),
        label: defaultPrimaryActionLabel,
      },
      link: {
        href: 'https://ela.st/docs-containers-add-metrics',
      },
    },
  };
};

export const addMetricsCalloutDefinitions = (
  locator: LocatorPublic<ObservabilityOnboardingLocatorParams> | undefined
): Record<
  AddMetricsCalloutKey,
  Omit<AddDataPanelProps, 'onDismiss' | 'onAddData' | 'onLearnMore' | 'onTryIt'>
> => {
  return {
    hostOverview: {
      ...defaultContent,
      ...hostDefaultActions(locator),
    },
    hostMetrics: {
      ...defaultContent,
      ...hostDefaultActions(locator),
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
      ...hostDefaultActions(locator),
    },
    containerOverview: {
      ...defaultContent,
      ...containerDefaultActions(locator),
    },
    containerMetrics: {
      ...defaultContent,
      ...containerDefaultActions(locator),
    },
  };
};
