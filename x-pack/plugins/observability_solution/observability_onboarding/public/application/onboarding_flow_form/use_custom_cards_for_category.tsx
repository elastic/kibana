/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import { useHistory } from 'react-router-dom';
import { useLocation } from 'react-router-dom-v5-compat';
import { ObservabilityOnboardingAppServices } from '../..';
import { CustomCard } from '../packages_list/types';
import { Category } from './types';
import { LogoIcon } from '../shared/logo_icon';

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
  const { href: otelLogsUrl } = reactRouterNavigate(history, `/otel-logs/${location.search}`);
  const { href: kubernetesUrl } = reactRouterNavigate(history, `/kubernetes/${location.search}`);

  const apmUrl = `${getUrlForApp?.('apm')}/${isServerless ? 'onboarding' : 'tutorial'}`;
  const otelApmUrl = isServerless ? `${apmUrl}?agent=openTelemetry` : apmUrl;

  switch (category) {
    case 'host':
      return [
        {
          id: 'auto-detect-logs',
          name: 'auto-detect-logs-virtual',
          type: 'virtual',
          title: 'Auto-detect Integrations with Elastic Agent',
          description: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.scanYourHostForLabel',
            {
              defaultMessage: 'Scan your host for log and metric files, auto-install integrations',
            }
          ),
          extraLabelsBadges: [
            <EuiFlexItem grow={false}>
              <LogoIcon logo="apple" size="m" />
            </EuiFlexItem>,
            <EuiFlexItem grow={false}>
              <LogoIcon logo="linux" size="m" />
            </EuiFlexItem>,
          ],
          categories: ['observability'],
          icons: [
            {
              type: 'eui',
              src: 'agentApp',
            },
          ],
          url: autoDetectUrl,
          version: '',
          integration: '',
          isQuickstart: true,
        },
        {
          id: 'otel-logs',
          name: 'custom-logs-virtual',
          type: 'virtual',
          title: 'Elastic Distribution for OTel Collector',
          description: 'Collect logs and host metrics using the Elastic Distro for OTel Collector ',
          extraLabelsBadges: [
            <EuiFlexItem grow={false}>
              <LogoIcon logo="apple" size="m" />
            </EuiFlexItem>,
            <EuiFlexItem grow={false}>
              <LogoIcon logo="linux" size="m" />
            </EuiFlexItem>,
          ],
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
          isQuickstart: true,
        },
      ];

    case 'kubernetes':
      return [
        {
          id: 'kubernetes-quick-start',
          name: 'kubernetes-quick-start',
          type: 'virtual',
          title: 'Elastic Agent',
          description: 'Monitor your Kubernetes cluster with Elastic Agent, collect container logs',
          extraLabelsBadges: [
            <EuiFlexItem grow={false}>
              <LogoIcon logo="kubernetes" size="m" />
            </EuiFlexItem>,
          ],
          categories: ['observability'],
          icons: [
            {
              type: 'eui',
              src: 'agentApp',
            },
          ],
          url: kubernetesUrl,
          version: '',
          integration: '',
          isQuickstart: true,
        },
        {
          id: 'otel-logs',
          name: 'custom-logs-virtual',
          type: 'virtual',
          title: 'Elastic Distribution for OTel Collector',
          description: 'Collect logs, metrics and traces for Kubernetes cluster monitoring',
          extraLabelsBadges: [
            <EuiFlexItem grow={false}>
              <LogoIcon logo="kubernetes" size="m" />
            </EuiFlexItem>,
          ],
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
        },
      ];

    case 'application':
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

    case 'cloud':
      return [
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
