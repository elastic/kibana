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
  const getUrlForApp = useKibana()?.services.application?.getUrlForApp;

  const { href: systemLogsUrl } = reactRouterNavigate(history, `/systemLogs/${location.search}`);
  const { href: customLogsUrl } = reactRouterNavigate(history, `/customLogs/${location.search}`);

  switch (category) {
    case 'apm':
      return [
        {
          id: 'apm-generated',
          type: 'generated',
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
          url: getUrlForApp?.('apm') ?? '',
          version: '',
          integration: '',
        },
        {
          id: 'synthetics-generated',
          type: 'generated',
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
          id: 'azure-generated',
          type: 'generated',
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
          id: 'aws-generated',
          type: 'generated',
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
          id: 'gcp-generated',
          type: 'generated',
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
          type: 'generated',
          title: 'Stream host system logs',
          description: 'The quickest path to onboard log data from your own machine or server',
          name: 'system-logs-generated',
          categories: ['observability'],
          icons: [
            {
              type: 'svg',
              src: '/XXXXXXXXXXXX/plugins/home/assets/logos/system.svg',
            },
          ],
          url: systemLogsUrl,
          version: '',
          integration: '',
        },
        {
          id: 'custom-logs',
          type: 'generated',
          title: 'Stream log files',
          description: 'Stream any logs into Elastic in a simple way and explore their data',
          name: 'custom-logs-generated',
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
          id: 'azure-logs-generated',
          type: 'generated',
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
          id: 'aws-logs-generated',
          type: 'generated',
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
          id: 'gcp-logs-generated',
          type: 'generated',
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
