/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import { i18n } from '@kbn/i18n';

export const registerEnterpriseSearchIntegrations = (
  customIntegrations: CustomIntegrationsPluginSetup
) => {
  customIntegrations.registerCustomIntegration({
    id: 'api',
    title: i18n.translate('xpack.enterpriseSearch.integrations.apiName', {
      defaultMessage: 'API',
    }),
    description: i18n.translate('xpack.enterpriseSearch.integrations.apiDescription', {
      defaultMessage: "Add search to your application with Elasticsearch's robust APIs.",
    }),
    categories: ['search', 'custom', 'elastic_stack', 'sdk_search', 'language_client'],
    uiInternalPath: '/app/elasticsearch/content/search_indices/new_index/api',
    icons: [
      {
        type: 'eui',
        src: 'logoEnterpriseSearch',
      },
    ],
    shipper: 'search',
    isBeta: false,
  });
};
