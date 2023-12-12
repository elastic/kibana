/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

const EXPECTED_PIPELINES = [
  'synthetics-tcp',
  'synthetics-http',
  'synthetics-icmp',
  'synthetics-browser',
  'synthetics-browser.screenshot',
  'synthetics-browser.network',
];

const EXPECTED_INDEX_TEMPLATES = [
  'synthetics',
  'synthetics-tcp',
  'synthetics-http',
  'synthetics-icmp',
  'synthetics-browser',
  'synthetics-browser.screenshot',
  'synthetics-browser.network',
];

export const getSyntheticsAssetsCheckRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.SYNTHETICS_ASSETS_CHECK,
  validate: {},
  handler: async ({
    server,
  }): Promise<{ hasAllAssets: boolean; reinstalled?: boolean; error?: string }> => {
    const esClient = server.coreStart.elasticsearch.client.asInternalUser;

    let hasAllAssets = true;
    const [pipelines, indexTemplates] = await Promise.all([
      esClient.ingest.getPipeline({
        id: 'synthetics-*',
      }),
      esClient.indices.getIndexTemplate({
        name: 'synthetics*',
      }),
    ]);
    const pipelineIds = Object.keys(pipelines);
    const missingPipelines = EXPECTED_PIPELINES.filter(
      (pipeline) => !pipelineIds.some((id) => id.startsWith(pipeline))
    );
    if (missingPipelines.length > 0) {
      hasAllAssets = false;
    }

    const indexTemplateNames = indexTemplates.index_templates ?? [];
    // all index templates should be present
    const missingIndexTemplates = EXPECTED_INDEX_TEMPLATES.filter(
      (template) => !indexTemplateNames.some(({ name }) => name === template)
    );
    if (missingIndexTemplates.length > 0) {
      hasAllAssets = false;
    }
    if (!hasAllAssets) {
      server.logger.error(
        `Synthetics assets are missing. Assets check route will try to reinstall assets.`
      );

      // reinstall synthetics integration

      // no need to add error handling here since fleetSetupCompleted is already wrapped in try/catch and will log
      // warning if setup fails to complete
      await server.fleet.fleetSetupCompleted();

      const installed = await server.fleet.packageService.asInternalUser.installPackage({
        pkgName: 'synthetics',
        force: true,
      });
      if (!installed) {
        server.logger.error(`Synthetics package is not installed, installation failed.`);
        return {
          hasAllAssets: false,
          error: 'Synthetics package is not installed, installation failed.',
        };
      } else {
        server.logger.info(`Synthetics package missing assets are installed.`);
        return { hasAllAssets: true, reinstalled: true };
      }
    }

    return { hasAllAssets };
  },
});
