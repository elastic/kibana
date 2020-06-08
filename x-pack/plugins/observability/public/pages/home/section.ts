/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

interface ISection {
  id: string;
  title: string;
  icon: string;
  description: string;
  href?: string;
  target?: '_blank';
}

export const appsSection: ISection[] = [
  {
    id: 'logs',
    title: i18n.translate('xpack.observability.section.apps.logs.title', {
      defaultMessage: 'Logs',
    }),
    icon: 'logoLogging',
    description: i18n.translate('xpack.observability.section.apps.logs.description', {
      defaultMessage:
        'The Elastic Stack (sometimes known as the ELK Stack) is the most popular open source logging platform.',
    }),
  },
  {
    id: 'apm',
    title: i18n.translate('xpack.observability.section.apps.apm.title', {
      defaultMessage: 'APM',
    }),
    icon: 'logoAPM',
    description: i18n.translate('xpack.observability.section.apps.apm.description', {
      defaultMessage:
        'See exactly where your application is spending time so you can quickly fix issues and feel good about the code you push.',
    }),
  },
  {
    id: 'metrics',
    title: i18n.translate('xpack.observability.section.apps.metrics.title', {
      defaultMessage: 'Metrics',
    }),
    icon: 'logoMetrics',
    description: i18n.translate('xpack.observability.section.apps.metrics.description', {
      defaultMessage:
        'Already using the Elastic Stack for logs? Add metrics in just a few steps and correlate metrics and logs in one place.',
    }),
  },
  {
    id: 'uptime',
    title: i18n.translate('xpack.observability.section.apps.uptime.title', {
      defaultMessage: 'Uptime',
    }),
    icon: 'logoUptime',
    description: i18n.translate('xpack.observability.section.apps.uptime.description', {
      defaultMessage:
        'React to availability issues across your apps and services before they affect users.',
    }),
  },
];

export const tryItOutItemsSection: ISection[] = [
  {
    id: 'demo',
    title: i18n.translate('xpack.observability.section.tryItOut.demo.title', {
      defaultMessage: 'Demo Playground',
    }),
    icon: 'play',
    description: '',
    href: 'https://demo.elastic.co/',
    target: '_blank',
  },
  {
    id: 'sampleData',
    title: i18n.translate('xpack.observability.section.tryItOut.sampleData.title', {
      defaultMessage: 'Add sample data',
    }),
    icon: 'documents',
    description: '',
    href: '/app/home#/tutorial_directory/sampleData',
  },
];
