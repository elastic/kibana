/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reactRouterNavigate, useKibana } from '@kbn/kibana-react-plugin/public';
import { useHistory } from 'react-router-dom';
import { useLocation } from 'react-router-dom-v5-compat';
import { CustomCard, FeaturedCard } from '../packages_list/types';
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
    services: { application, http },
  } = useKibana();
  const getUrlForApp = application?.getUrlForApp;
  const basePath = http?.basePath;

  const { href: systemLogsUrl } = reactRouterNavigate(history, `/systemLogs/${location.search}`);
  const { href: customLogsUrl } = reactRouterNavigate(history, `/customLogs/${location.search}`);

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
          url: `${getUrlForApp?.('apm')}/onboarding` ?? '',
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
              src:
                basePath?.prepend('/plugins/observabilityOnboarding/assets/opentelemetry.svg') ??
                '',
            },
          ],
          url: `${getUrlForApp?.('apm')}/onboarding?agent=openTelemetry` ?? '',
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
        toFeaturedCard('kubernetes'),
        toFeaturedCard('prometheus'),
        toFeaturedCard('docker'),
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
          id: 'system-logs',
          type: 'virtual',
          title: 'Stream host system logs',
          description: 'The quickest path to onboard log data from your own machine or server',
          name: 'system-logs-virtual',
          categories: ['observability'],
          icons: [
            {
              type: 'svg',
              src: basePath?.prepend('/plugins/home/assets/logos/system.svg') ?? '',
            },
          ],
          url: systemLogsUrl,
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
        toFeaturedCard('nginx'),
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
