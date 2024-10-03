/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { AddDataPanelProps } from '@kbn/observability-shared-plugin/public/components/add_data_panel';

export type AddDataCalloutKey =
  | 'hostOverview'
  | 'hostMetrics'
  | 'hostProcesses'
  | 'containerOverview'
  | 'containerMetrics';

const defaultPrimaryAction = {
  href: '', // TODO add correct href
  label: i18n.translate('xpack.infra.addDataCallout.hostOverviewPrimaryActionLabel', {
    defaultMessage: 'Add Metrics',
  }),
};

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

const hostDefaultActions = {
  actions: {
    primary: defaultPrimaryAction,
    secondary: {
      href: 'https://ela.st/demo-cluster-hosts',
    },
    link: {
      href: 'https://ela.st/docs-hosts-add-metrics',
    },
  },
};

const containerDefaultActions = {
  actions: {
    primary: defaultPrimaryAction,
    link: {
      href: 'https://ela.st/docs-containers-add-metrics',
    },
  },
};

export const addDataCalloutDefinitions: Record<
  AddDataCalloutKey,
  Omit<AddDataPanelProps, 'onDismiss' | 'onAddData' | 'onLearnMore' | 'onTryIt'>
> = {
  hostOverview: {
    ...defaultContent,
    ...hostDefaultActions,
  },
  hostMetrics: {
    ...defaultContent,
    ...hostDefaultActions,
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
    ...hostDefaultActions,
  },
  containerOverview: {
    ...defaultContent,
    ...containerDefaultActions,
  },
  containerMetrics: {
    ...defaultContent,
    ...containerDefaultActions,
  },
};
