/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter } from '@kbn/core/server';
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { APMTracer } from '@kbn/langchain/server/tracers/apm';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { isPlainObject } from 'lodash/fp';
import { ECS_GRAPH_PATH, EcsMappingRequestBody, EcsMappingResponse } from '../../common';
import { ROUTE_HANDLER_TIMEOUT } from '../constants';
import { getEcsGraph } from '../graphs/ecs';
import type { IntegrationAssistantRouteHandlerContext } from '../plugin';
import { buildRouteValidationWithZod } from '../util/route_validation';
import { withAvailability } from './with_availability';
import { getLogTypeDetectionGraph } from '../graphs/log_type_detection/graph';

export function registerEcsRoutes(router: IRouter<IntegrationAssistantRouteHandlerContext>) {
  router.versioned
    .post({
      path: ECS_GRAPH_PATH,
      access: 'internal',
      options: {
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(EcsMappingRequestBody),
          },
        },
      },
      withAvailability(async (context, req, res): Promise<IKibanaResponse<EcsMappingResponse>> => {
        const { packageName, dataStreamName, rawSamples, mapping, langSmithOptions } = req.body;
        const { getStartServices, logger } = await context.integrationAssistant;

        const [, { actions: actionsPlugin }] = await getStartServices();
        try {
          const actionsClient = await actionsPlugin.getActionsClientWithRequest(req);
          const connector = req.body.connectorId
            ? await actionsClient.get({ id: req.body.connectorId })
            : (await actionsClient.getAll()).filter(
                (connectorItem) => connectorItem.actionTypeId === '.bedrock'
              )[0];

          const abortSignal = getRequestAbortedSignal(req.events.aborted$);
          const isOpenAI = connector.actionTypeId === '.gen-ai';

          const llmClass = isOpenAI ? ActionsClientChatOpenAI : ActionsClientSimpleChatModel;

          const model = new llmClass({
            actionsClient,
            connectorId: connector.id,
            logger,
            llmType: isOpenAI ? 'openai' : 'bedrock',
            model: connector.config?.defaultModel,
            temperature: 0.05,
            maxTokens: 4096,
            signal: abortSignal,
            streaming: false,
          });

          const { isJSON, error, logsSampleParsed } = parseLogsContent(rawSamples);
          if (error) {
            return res.customError({ statusCode: 500, body: { message: error } });
          }

          const parameters = {
            packageName,
            dataStreamName,
            logsSampleParsed,
            ...(mapping && { mapping }),
          };

          const options = {
            callbacks: [
              new APMTracer({ projectName: langSmithOptions?.projectName ?? 'default' }, logger),
              ...getLangSmithTracer({ ...langSmithOptions, logger }),
            ],
          };

          let graph;
          let results;
          if (isJSON) {
            graph = await getEcsGraph(model);
            results = await graph.invoke(parameters, options);
          } else {
            graph = await getLogTypeDetectionGraph(model);
            // const { jsonSamples, additionalProcessors } = await graph.invoke(parameters, options);
            // parameters = {
            //   packageName,
            //   dataStreamName,
            //   logsSampleParsed,
            //   jsonSamples,
            //   additionalProcessors,
            //   ...(mapping && { mapping }),
            // };
            // graph = await getEcsGraph(model);
            results = await graph.invoke(parameters, options);
          }

          return res.ok({ body: EcsMappingResponse.parse(results) });
        } catch (e) {
          return res.badRequest({ body: e });
        }
      })
    );
}

function parseLogsContent(fileContent: string): {
  isJSON?: boolean;
  error?: string;
  logsSampleParsed?: string[];
} {
  let parsedContent: string[];
  let isJSON = false;
  const base64encodedContent = fileContent.split('base64,')[1];
  const decodedFileContent = Buffer.from(base64encodedContent, 'base64').toString('utf-8');
  try {
    parsedContent = decodedFileContent
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line));

    // Special case for files that can be parsed as both JSON and NDJSON:
    //   for a one-line array [] -> extract its contents
    //   for a one-line object {} -> do nothing
    if (
      Array.isArray(parsedContent) &&
      parsedContent.length === 1 &&
      Array.isArray(parsedContent[0])
    ) {
      parsedContent = parsedContent[0];
      isJSON = true;
    }
  } catch (parseNDJSONError) {
    try {
      parsedContent = JSON.parse(decodedFileContent);
      isJSON = true;
    } catch (parseJSONError) {
      parsedContent = decodedFileContent.split('\n').filter((line) => line.trim() !== '');
    }
  }

  if (!Array.isArray(parsedContent)) {
    return { error: 'The logs sample file is not an array' };
  }
  if (parsedContent.length === 0) {
    return { error: 'The logs sample file is empty' };
  }

  if (parsedContent.some((log) => !isPlainObject(log))) {
    return { error: 'The logs sample file contains non-object entries' };
  }

  return { logsSampleParsed: parsedContent, isJSON };
}
