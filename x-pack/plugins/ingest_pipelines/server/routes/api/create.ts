/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { Pipeline } from '../../../common/types';
import { API_BASE_PATH } from '../../../common/constants';
import { RouteDependencies } from '../../types';
import { pipelineSchema } from './pipeline_schema';
import { isObjectWithKeys } from './shared';

const bodySchema = schema.object({
  name: schema.string(),
  ...pipelineSchema,
});

export const registerCreateRoute = ({
  router,
  license,
  lib: { isEsError },
}: RouteDependencies): void => {
  router.post(
    {
      path: API_BASE_PATH,
      validate: {
        body: bodySchema,
      },
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const { callAsCurrentUser } = ctx.core.elasticsearch.legacy.client;
      const pipeline = req.body as Pipeline;

      const { name, description, processors, version, on_failure } = pipeline;

      try {
        // Check that a pipeline with the same name doesn't already exist
        const pipelineByName = await callAsCurrentUser('ingest.getPipeline', { id: name });

        if (pipelineByName[name]) {
          return res.conflict({
            body: new Error(
              i18n.translate('xpack.ingestPipelines.createRoute.duplicatePipelineIdErrorMessage', {
                defaultMessage: "There is already a pipeline with name '{name}'.",
                values: {
                  name,
                },
              })
            ),
          });
        }
      } catch (e) {
        // Silently swallow error
      }

      try {
        const response = await callAsCurrentUser('ingest.putPipeline', {
          id: name,
          body: {
            description,
            processors,
            version,
            on_failure,
          },
        });

        return res.ok({ body: response });
      } catch (error) {
        if (isEsError(error)) {
          return res.customError({
            statusCode: error.statusCode,
            body: isObjectWithKeys(error.body)
              ? {
                  message: error.message,
                  attributes: error.body,
                }
              : error,
          });
        }

        return res.internalError({ body: error });
      }
    })
  );
};
