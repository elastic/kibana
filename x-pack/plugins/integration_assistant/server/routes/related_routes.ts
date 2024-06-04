/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { BedrockChat } from '@kbn/langchain/server/language_models';
import { RELATED_GRAPH_PATH } from '../../common';
import type { RelatedApiRequest, RelatedApiResponse } from '../../common/types';
import { getRelatedGraph } from '../graphs/related';
import { ROUTE_HANDLER_TIMEOUT } from '../constants';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';

export function registerRelatedRoutes(router: IRouter<IntegrationAssistantRouteHandlerContext>) {
  router.post(
    {
      path: `${RELATED_GRAPH_PATH}`,
      options: {
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
      validate: {
        body: schema.object({
          packageName: schema.string(),
          dataStreamName: schema.string(),
          rawSamples: schema.arrayOf(schema.string()),
          // TODO: This is a single nested object of any key or shape, any better schema?
          currentPipeline: schema.maybe(schema.any()),
          connectorId: schema.maybe(schema.string()),
          region: schema.maybe(schema.string()),
          model: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      const { packageName, dataStreamName, rawSamples, currentPipeline } =
        req.body as RelatedApiRequest;

      const services = await context.resolve(['core']);
      const { client } = services.core.elasticsearch;
      const { getStartServices } = await context.integrationAssistant;
      const [, { actions: actionsPlugin }] = await getStartServices();
      const actionsClient = await actionsPlugin.getActionsClientWithRequest(req);
      const connector = req.body.connectorId
        ? await actionsClient.get({ id: req.body.connectorId })
        : (await actionsClient.getAll()).filter(
            (connectorItem) => connectorItem.actionTypeId === '.bedrock'
          )[0];

      const model = new BedrockChat({
        actionsClient,
        connectorId: connector.id,
        model: req.body.model || connector.config?.defaultModel,
        region: req.body.region || connector.config?.apiUrl.split('.')[1],
        temperature: 0.05,
        maxTokens: 4096,
        modelKwargs: {
          top_k: 200,
          temperature: 0.05,
          top_p: 0.4,
          stop_sequences: ['Human:'],
        },
      });

      const graph = await getRelatedGraph(client, model);
      let results = { results: { docs: {}, pipeline: {} } };
      try {
        results = (await graph.invoke({
          packageName,
          dataStreamName,
          rawSamples,
          currentPipeline,
        })) as RelatedApiResponse;
      } catch (e) {
        return res.badRequest({ body: e });
      }

      return res.ok({ body: results });
    }
  );
}
