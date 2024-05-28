/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import { i18n } from '@kbn/i18n';
import { ConnectorServerSideDefinition } from '@kbn/search-connectors-plugin/server';

import { ConfigType } from '.';

export const registerEnterpriseSearchIntegrations = (
  config: ConfigType,
  customIntegrations: CustomIntegrationsPluginSetup,
  isCloud: boolean,
  connectors: ConnectorServerSideDefinition[]
) => {
  const nativeSearchTag = config.hasNativeConnectors && isCloud ? ['native_search'] : [];
  if (config.canDeployEntSearch) {
    customIntegrations.registerCustomIntegration({
      id: 'app_search_json',
      title: i18n.translate('xpack.enterpriseSearch.appSearch.integrations.jsonName', {
        defaultMessage: 'JSON',
      }),
      description: i18n.translate('xpack.enterpriseSearch.appSearch.integrations.jsonDescription', {
        defaultMessage: 'Search over your JSON data with App Search.',
      }),
      categories: ['enterprise_search', 'custom', 'app_search'],
      uiInternalPath: '/app/enterprise_search/app_search/engines/new?method=json',
      icons: [
        {
          type: 'eui',
          src: 'logoAppSearch',
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });
  }

  if (config.hasWebCrawler) {
    customIntegrations.registerCustomIntegration({
      id: 'web_crawler',
      title: i18n.translate('xpack.enterpriseSearch.integrations.webCrawlerName', {
        defaultMessage: 'Web crawler',
      }),
      description: i18n.translate('xpack.enterpriseSearch.integrations.webCrawlerDescription', {
        defaultMessage: 'Add search to your website with the web crawler.',
      }),
      categories: ['enterprise_search', 'app_search', 'web', 'elastic_stack', 'crawler'],
      uiInternalPath: '/app/enterprise_search/content/crawlers/new_crawler',
      icons: [
        {
          type: 'eui',
          src: 'logoEnterpriseSearch',
        },
      ],
      shipper: 'enterprise_search',
      isBeta: false,
    });
  }

  customIntegrations.registerCustomIntegration({
    id: 'api',
    title: i18n.translate('xpack.enterpriseSearch.integrations.apiName', {
      defaultMessage: 'API',
    }),
    description: i18n.translate('xpack.enterpriseSearch.integrations.apiDescription', {
      defaultMessage: "Add search to your application with Elasticsearch's robust APIs.",
    }),
    categories: ['enterprise_search', 'custom', 'elastic_stack', 'sdk_search', 'language_client'],
    uiInternalPath: '/app/enterprise_search/content/search_indices/new_index/api',
    icons: [
      {
        type: 'eui',
        src: 'logoEnterpriseSearch',
      },
    ],
    shipper: 'enterprise_search',
    isBeta: false,
  });

  if (config.hasConnectors) {
    connectors.forEach((connector) => {
      const connectorType = connector.isNative && isCloud ? 'native' : 'connector_client';
      const categories = connector.isNative
        ? [...(connector.categories || []), ...nativeSearchTag]
        : connector.categories;

      customIntegrations.registerCustomIntegration({
        categories: categories || [],
        description: connector.description || '',
        icons: [
          {
            src: connector.iconPath,
            type: 'svg',
          },
        ],
        id: `${connector.serviceType}-${connector.name}`,
        isBeta: connector.isBeta,
        shipper: 'enterprise_search',
        title: connector.name,
        uiInternalPath: `/app/enterprise_search/content/connectors/new_connector?connector_type=${connectorType}&service_type=${connector.serviceType}`,
      });
    });
  }
};
