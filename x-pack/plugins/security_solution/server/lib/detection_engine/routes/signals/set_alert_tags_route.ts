/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';
import { uniq } from 'lodash/fp';
import type { SetAlertTagsSchemaDecoded } from '../../../../../common/detection_engine/schemas/request/set_alert_tags_schema';
import { setAlertTagsSchema } from '../../../../../common/detection_engine/schemas/request/set_alert_tags_schema';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_ALERT_TAGS_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import type { SetupPlugins } from '../../../../plugin';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { validateAlertTagsArrays } from './helpers';

export const setAlertTagsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: DETECTION_ENGINE_ALERT_TAGS_URL,
      validate: {
        body: buildRouteValidation<typeof setAlertTagsSchema, SetAlertTagsSchemaDecoded>(
          setAlertTagsSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const { tags, query } = request.body;
      const core = await context.core;
      const securitySolution = await context.securitySolution;
      const esClient = core.elasticsearch.client.asCurrentUser;
      const siemClient = securitySolution?.getAppClient();
      const siemResponse = buildSiemResponse(response);
      const validationErrors = validateAlertTagsArrays(tags);
      const spaceId = securitySolution?.getSpaceId() ?? 'default';

      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      if (!siemClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      let queryObject;
      if (query) {
        queryObject = {
          bool: {
            filter: query,
          },
        };
      }
      const tagsToAdd = uniq(tags.tags_to_add);
      const tagsToRemove = uniq(tags.tags_to_remove);
      try {
        const body = await esClient.updateByQuery({
          index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
          refresh: true,
          body: {
            script: {
              params: { tagsToAdd, tagsToRemove },
              source: `List newTagsArray = []; 
              if (ctx._source.tags != null) {
                for (tag in ctx._source.tags) {
                  if (!params.tagsToRemove.contains(tag)) {
                    newTagsArray.add(tag);
                  } 
                }
                for (tag in params.tagsToAdd) {
                  if (!newTagsArray.contains(tag)) {
                    newTagsArray.add(tag)
                  }
                }
                ctx._source.tags = newTagsArray;
              } else {
                ctx._source.tags = params.tagsToAdd;
              }
              `,
              lang: 'painless',
            },
            query: queryObject,
          },
          ignore_unavailable: true,
        });
        return response.ok({ body });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
