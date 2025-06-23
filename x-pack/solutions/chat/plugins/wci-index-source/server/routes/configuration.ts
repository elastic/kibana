/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { apiCapabilities } from '@kbn/workchat-app/common/features';
import { buildSchema } from '@kbn/wc-index-schema-builder';
import { getConnectorList, getDefaultConnector } from '@kbn/wc-genai-utils';
import type {
  GenerateConfigurationResponse,
  SearchIndicesResponse,
} from '../../common/http_api/configuration';
import type { RouteDependencies } from './types';

export const registerConfigurationRoutes = ({ router, core, logger }: RouteDependencies) => {
  // generate the index integration schema for a given index
  router.post(
    {
      path: '/internal/wci-index-source/configuration/generate',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.manageWorkchat],
        },
      },
      validate: {
        body: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    async (ctx, request, res) => {
      try {
        const [, { actions, inference }] = await core.getStartServices();
        const { elasticsearch } = await ctx.core;

        const connectors = await getConnectorList({ actions, request });
        const connector = getDefaultConnector({ connectors });

        const chatModel = await inference.getChatModel({
          request,
          connectorId: connector.connectorId,
          chatModelOptions: {},
        });

        const { indexName } = request.body;
        const definition = await buildSchema({
          indexName,
          chatModel,
          esClient: elasticsearch.client.asCurrentUser,
          logger,
        });

        return res.ok<GenerateConfigurationResponse>({
          body: {
            definition,
          },
        });
      } catch (e) {
        logger.error(e);
        throw e;
      }
    }
  );

  router.get(
    {
      path: '/internal/wci-index-source/indices-autocomplete',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.manageWorkchat],
        },
      },
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, res) => {
      const { elasticsearch } = await ctx.core;
      let pattern = request.query.index || '';

      if (pattern.length >= 3) {
        pattern = `${pattern}*`;
      }

      const esClient = elasticsearch.client.asCurrentUser;

      try {
        const response = await esClient.cat.indices({
          index: [pattern],
          h: 'index',
          expand_wildcards: 'open',
          format: 'json',
        });

        return res.ok<SearchIndicesResponse>({
          body: {
            indexNames: response
              .map((indexRecord) => indexRecord.index)
              .filter((index) => !!index) as string[],
          },
        });
      } catch (e) {
        // TODO: sigh, is there a better way?
        if (e?.meta?.body?.error?.type === 'index_not_found_exception') {
          return res.ok<SearchIndicesResponse>({
            body: {
              indexNames: [],
            },
          });
        }
        throw e;
      }
    }
  );
};
