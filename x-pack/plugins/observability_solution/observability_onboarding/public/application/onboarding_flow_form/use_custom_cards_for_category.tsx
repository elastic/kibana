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
  const { href: otelKubernetesUrl } = reactRouterNavigate(
    history,
    `/otel-kubernetes/${location.search}`
  );

  const apmUrl = `${getUrlForApp?.('apm')}/${isServerless ? 'onboarding' : 'tutorial'}`;
  const otelApmUrl = isServerless ? `${apmUrl}?agent=openTelemetry` : apmUrl;

  switch (category) {
    case 'host':
      return [
        {
          id: 'auto-detect-logs',
          name: 'auto-detect-logs-virtual',
          type: 'virtual',
          title: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.autoDetectTitle',
            {
              defaultMessage: 'Auto-detect Integrations with Elastic Agent',
            }
          ),
          description: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.autoDetectDescription',
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
          title: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.logsOtelTitle',
            {
              defaultMessage: 'Host monitoring with EDOT Collector',
            }
          ),
          description: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.logsOtelDescription',
            {
              defaultMessage:
                'Collect logs and host metrics with the Elastic Distro for OTel Collector',
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
          title: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.kubernetesTitle',
            {
              defaultMessage: 'Kubernetes monitoring with Elastic Agent',
            }
          ),
          description: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.kubernetesDescription',
            {
              defaultMessage:
                'Monitor your Kubernetes cluster with Elastic Agent, collect container logs',
            }
          ),
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
          id: 'otel-kubernetes',
          name: 'otel-kubernetes-virtual',
          type: 'virtual',
          title: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.kubernetesOtelTitle',
            {
              defaultMessage: 'Kubernetes monitoring with EDOT Collector',
            }
          ),
          description: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.kubernetesOtelDescription',
            {
              defaultMessage:
                'Unified Kubernetes observability with Elastic Distro for OTel Collector',
            }
          ),
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
          url: isServerless ? otelLogsUrl : otelKubernetesUrl,
          version: '',
          integration: '',
          isQuickstart: !isServerless,
        },
      ];

    case 'application':
      return [
        {
          id: 'apm-virtual',
          type: 'virtual',
          title: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.apmTitle',
            {
              defaultMessage: 'Elastic APM',
            }
          ),
          description: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.apmDescription',
            {
              defaultMessage: 'Collect distributed traces from your applications with Elastic APM',
            }
          ),
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
          title: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.apmOtelTitle',
            {
              defaultMessage: 'OpenTelemetry',
            }
          ),
          description: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.apmOtelDescription',
            {
              defaultMessage: 'Collect distributed traces with OpenTelemetry',
            }
          ),
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
          title: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.syntheticsTitle',
            {
              defaultMessage: 'Synthetic monitor',
            }
          ),
          description: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.syntheticsDescription',
            {
              defaultMessage: 'Monitor endpoints, pages, and user journeys',
            }
          ),
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
          title: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.azureTitle',
            {
              defaultMessage: 'Azure',
            }
          ),
          description: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.azureDescription',
            {
              defaultMessage: 'Collect logs from Microsoft Azure',
            }
          ),
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
          title: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.awsTitle',
            {
              defaultMessage: 'AWS',
            }
          ),
          description: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.awsDescription',
            {
              defaultMessage: 'Collect logs from Amazon Web Services (AWS)',
            }
          ),
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
          title: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.gcpTitle',
            {
              defaultMessage: 'Google Cloud Platform',
            }
          ),
          description: i18n.translate(
            'xpack.observability_onboarding.useCustomCardsForCategory.gcpDescription',
            {
              defaultMessage: 'Collect logs from Google Cloud Platform',
            }
          ),
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
