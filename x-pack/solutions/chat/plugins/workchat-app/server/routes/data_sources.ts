/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDependencies } from './types';

import { schema } from '@kbn/config-schema';

export const registerDataSourcesRoutes = ({ router, getServices, logger }: RouteDependencies) => {
  router.get(
    {
      path: '/internal/workchat_app/data_sources',
      validate: {},
      security: {
        authz: {
          enabled: false,
          reason: 'Internal API for listing registered data sources',
        },
      },
    },
    async (context, request, response) => {
      logger.info('DataSourcesAPI: GET /internal/workchat_app/data_sources called');

      try {
        const services = getServices();
        logger.info('DataSourcesAPI: Got services, calling dataSourcesRegistry.getAll()');

        // Get all registered data sources from the registry
        const dataSources = services.dataSourcesRegistry.getAll();

        logger.info(`DataSourcesAPI: Registry returned ${dataSources.length} data sources`);
        dataSources.forEach((source, index) => {
          logger.info(
            `  API Response ${index + 1}. ${source.name} (${source.type}) - ${source.provider}`
          );
        });

        const responseBody = {
          data_sources: dataSources,
        };

        logger.info(`DataSourcesAPI: Returning response with ${dataSources.length} data sources`);
        return response.ok({
          body: responseBody,
        });
      } catch (error) {
        logger.error('DataSourcesAPI: Error occurred:', error);
        return response.badRequest({
          body: {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
          },
        });
      }
    }
  );

  router.get(
    {
      path: '/internal/workchat_app/data_sources/{type}/ui_config',
      validate: {
        params: schema.object({
          type: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Internal API for getting data source UI configuration',
        },
      },
    },
    async (context, request, response) => {
      const { type } = request.params;
      logger.info(
        `DataSourcesAPI: GET /internal/workchat_app/data_sources/${type}/ui_config called`
      );

      try {
        const services = getServices();

        // Get UI config for the specific data source type
        const uiConfig = services.dataSourcesRegistry.getUIConfig(type);

        logger.info(
          `DataSourcesAPI: Found UI config for type ${type}: ${JSON.stringify(uiConfig)}`
        );

        return response.ok({
          body: {
            ui_config: uiConfig,
          },
        });
      } catch (error) {
        logger.error(`DataSourcesAPI: Error getting UI config for type ${type}:`, error);
        return response.badRequest({
          body: {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
          },
        });
      }
    }
  );
};
