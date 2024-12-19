/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPackageJson } from '@kbn/repo-info';

import { RouteDependencies } from '../../plugin';
import { elasticsearchErrorHandler } from '../../utils/elasticsearch_error_handler';

export function registerConfigDataRoute({
  router,
  config,
  log,
  globalConfigService,
}: RouteDependencies) {
  router.get(
    {
      path: '/internal/enterprise_search/config_data',
      validate: false,
    },
    elasticsearchErrorHandler(log, async (_context, _request, response) => {
      const data = {
        features: {
          hasConnectors: config.hasConnectors,
          hasDefaultIngestPipeline: config.hasDefaultIngestPipeline,
          hasDocumentLevelSecurityEnabled: config.hasDocumentLevelSecurityEnabled,
          hasIncrementalSyncEnabled: config.hasIncrementalSyncEnabled,
          hasNativeConnectors: config.hasNativeConnectors,
          hasWebCrawler: config.hasWebCrawler,
        },
        kibanaVersion: kibanaPackageJson.version,
      };

      return response.ok({
        body: data,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  router.get(
    {
      path: '/internal/enterprise_search/es_config',
      validate: false,
    },
    elasticsearchErrorHandler(log, async (context, request, response) => {
      return response.ok({
        body: { elasticsearch_host: globalConfigService.elasticsearchUrl },
        headers: { 'content-type': 'application/json' },
      });
    })
  );
}
