/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import { useHistory } from 'react-router-dom';
import { useLocation } from 'react-router-dom-v5-compat';
import { ObservabilityOnboardingAppServices } from '../..';
import { CustomCard, FeaturedCard, VirtualCard } from '../packages_list/types';
import { Category } from './types';

function toFeaturedCard(name: string): FeaturedCard {
  return { type: 'featured', name };
}

export function useCustomCardsForCategory(
  createCollectionCardHandler: (query: string) => () => void,
  category: Category | null
): CustomCard[] | undefined {
  const history = useHistory();
  const location = useLocation();
  const {
    services: {
      application,
      http,
      context: { isServerless },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const getUrlForApp = application?.getUrlForApp;

  const { href: autoDetectUrl } = reactRouterNavigate(history, `/auto-detect/${location.search}`);
  const { href: customLogsUrl } = reactRouterNavigate(history, `/customLogs/${location.search}`);
  const { href: otelLogsUrl } = reactRouterNavigate(history, `/otel-logs/${location.search}`);
  const { href: otelKubernetesUrl } = reactRouterNavigate(
    history,
    `/otel-kubernetes/${location.search}`
  );
  const { href: kubernetesUrl } = reactRouterNavigate(history, `/kubernetes/${location.search}`);

  const apmUrl = `${getUrlForApp?.('apm')}/${isServerless ? 'onboarding' : 'tutorial'}`;
  const otelApmUrl = isServerless ? `${apmUrl}?agent=openTelemetry` : apmUrl;

  const otelLogsCard: VirtualCard = {
    id: 'otel-logs',
    type: 'virtual',
    release: 'preview',
    title: 'OpenTelemetry',
    description:
      'Collect logs and host metrics using the Elastic distribution of the OpenTelemetry Collector',
    name: 'custom-logs-virtual',
    categories: ['observability'],
    icons: [
      {
        type: 'svg',
        src: http?.staticAssets.getPluginAssetHref('opentelemetry.svg') ?? '',
      },
    ],
    url: otelLogsUrl,
    version: '',
    integration: '',
  };

  const otelKubernetesCard: VirtualCard = {
    id: 'otel-kubernetes',
    type: 'virtual',
    release: 'preview',
    title: 'Elastic Distro for OTel Collector',
    description:
      'Collect logs, metrics and traces for Kubernetes cluster monitoring  using the Elastic Distro for OTel Collector',
    name: 'custom-kubernetes-virtual',
    categories: ['observability'],
    icons: [
      {
        type: 'svg',
        src: http?.staticAssets.getPluginAssetHref('opentelemetry.svg') ?? '',
      },
    ],
    url: otelKubernetesUrl,
    version: '',
    integration: '',
  };

  switch (category) {
    case 'apm':
      return [
        {
          id: 'apm-virtual',
          type: 'virtual',
          title: 'Elastic APM',
          description: 'Collect distributed traces from your applications with Elastic APM',
          name: 'apm',
          categories: ['observability'],
          icons: [
            {
              type: 'eui',
              src: 'apmApp',
            },
          ],
          url: apmUrl,
          version: '',
          integration: '',
        },
        {
          id: 'otel-virtual',
          type: 'virtual',
          title: 'OpenTelemetry',
          description: 'Collect distributed traces with OpenTelemetry',
          name: 'otel',
          categories: ['observability'],
          icons: [
            {
              type: 'svg',
              src: http?.staticAssets.getPluginAssetHref('opentelemetry.svg') ?? '',
            },
          ],
          url: otelApmUrl,
          version: '',
          integration: '',
        },
        {
          id: 'synthetics-virtual',
          type: 'virtual',
          title: 'Synthetic monitor',
          description: 'Monitor endpoints, pages, and user journeys',
          name: 'synthetics',
          categories: ['observability'],
          icons: [
            {
              type: 'eui',
              src: 'logoUptime',
            },
          ],
          url: getUrlForApp?.('synthetics') ?? '',
          version: '',
          integration: '',
        },
      ];
    case 'infra':
      return [
        {
          id: 'kubernetes-quick-start',
          type: 'virtual',
          title: 'Kubernetes',
          release: 'preview',
          description: 'Collect logs and metrics from Kubernetes using minimal configuration',
          name: 'kubernetes-quick-start',
          categories: ['observability'],
          icons: [
            {
              type: 'svg',
              src: http?.staticAssets.getPluginAssetHref('kubernetes.svg') ?? '',
            },
          ],
          url: kubernetesUrl,
          version: '',
          integration: '',
        },
        otelKubernetesCard,
        toFeaturedCard('docker'),
        otelLogsCard,
        {
          id: 'azure-virtual',
          type: 'virtual',
          title: 'Azure',
          description: 'Collect logs and metrics from Microsoft Azure',
          name: 'azure',
          categories: ['observability'],
          icons: [],
          url: 'https://azure.com',
          version: '',
          integration: '',
          isCollectionCard: true,
          onCardClick: createCollectionCardHandler('azure'),
        },
        {
          id: 'aws-virtual',
          type: 'virtual',
          title: 'AWS',
          description: 'Collect logs and metrics from Amazon Web Services (AWS)',
          name: 'aws',
          categories: ['observability'],
          icons: [],
          url: 'https://aws.com',
          version: '',
          integration: '',
          isCollectionCard: true,
          onCardClick: createCollectionCardHandler('aws'),
        },
        {
          id: 'gcp-virtual',
          type: 'virtual',
          title: 'Google Cloud Platform',
          description: 'Collect logs and metrics from Google Cloud Platform',
          name: 'gcp',
          categories: ['observability'],
          icons: [],
          url: '',
          version: '',
          integration: '',
          isCollectionCard: true,
          onCardClick: createCollectionCardHandler('gcp'),
        },
      ];
    case 'logs':
      return [
        {
          id: 'auto-detect-logs',
          type: 'virtual',
          title: 'Auto-detect logs and metrics',
          release: 'preview',
          description: 'This installation scans your host and auto-detects log files and metrics',
          name: 'auto-detect-logs-virtual',
          categories: ['observability'],
          icons: [
            {
              type: 'eui',
              src: 'consoleApp',
            },
          ],
          url: autoDetectUrl,
          version: '',
          integration: '',
        },
        {
          id: 'custom-logs',
          type: 'virtual',
          title: 'Stream log files',
          description: 'Stream any logs into Elastic in a simple way and explore their data',
          name: 'custom-logs-virtual',
          categories: ['observability'],
          icons: [
            {
              type: 'eui',
              src: 'filebeatApp',
            },
          ],
          url: customLogsUrl,
          version: '',
          integration: '',
        },
        otelLogsCard,
        {
          id: 'azure-logs-virtual',
          type: 'virtual',
          title: 'Azure',
          description: 'Collect logs from Microsoft Azure',
          name: 'azure',
          categories: ['observability'],
          icons: [],
          url: 'https://azure.com',
          version: '',
          integration: '',
          isCollectionCard: true,
          onCardClick: createCollectionCardHandler('azure'),
        },
        {
          id: 'aws-logs-virtual',
          type: 'virtual',
          title: 'AWS',
          description: 'Collect logs from Amazon Web Services (AWS)',
          name: 'aws',
          categories: ['observability'],
          icons: [],
          url: 'https://aws.com',
          version: '',
          integration: '',
          isCollectionCard: true,
          onCardClick: createCollectionCardHandler('aws'),
        },
        {
          id: 'gcp-logs-virtual',
          type: 'virtual',
          title: 'Google Cloud Platform',
          description: 'Collect logs from Google Cloud Platform',
          name: 'gcp',
          categories: ['observability'],
          icons: [],
          url: '',
          version: '',
          integration: '',
          isCollectionCard: true,
          onCardClick: createCollectionCardHandler('gcp'),
        },
      ];

    default:
      return undefined;
  }
}
