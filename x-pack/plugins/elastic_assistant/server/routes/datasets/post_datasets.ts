/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type IKibanaResponse, IRouter } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PostDatasetsBody,
  PostDatasetsRequestQuery,
  PostDatasetsResponse,
} from '@kbn/elastic-assistant-common';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';
import { DATASETS } from '../../../common/constants';
import { addToLangSmithDataset } from '../evaluate/utils';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';

export const postDatasetsRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .post({
      access: INTERNAL_API_ACCESS,
      path: DATASETS,
      options: {
        tags: ['access:elasticAssistant'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PostDatasetsBody),
            query: buildRouteValidationWithZod(PostDatasetsRequestQuery),
          },
          response: {
            200: {
              body: buildRouteValidationWithZod(PostDatasetsResponse),
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PostDatasetsResponse>> => {
        const assistantContext = await context.elasticAssistant;
        const logger = assistantContext.logger;

        // Validate evaluation feature is enabled
        const pluginName = getPluginNameFromRequest({
          request,
          defaultPluginName: DEFAULT_PLUGIN_NAME,
          logger,
        });
        const registeredFeatures = assistantContext.getRegisteredFeatures(pluginName);
        if (!registeredFeatures.assistantModelEvaluation) {
          return response.notFound();
        }

        try {
          const { datasetId } = request.query;
          const { dataset } = request.body;

          // console.log('datasetId:', datasetId);
          // console.log('dataset:', JSON.stringify(dataset, null, 2));

          const addToDatasetResponse = await addToLangSmithDataset({
            dataset,
            datasetId,
            logger,
          });

          return response.ok({
            body: { datasetId: addToDatasetResponse ?? '', success: addToDatasetResponse != null },
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          const resp = buildResponse(response);
          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
