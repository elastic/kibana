/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { uniq } from 'lodash/fp';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SetAlertTagsRequestBody } from '../../../../../common/api/detection_engine/alert_tags';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_ALERT_TAGS_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { validateAlertTagsArrays } from './helpers';

export const setAlertTagsRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_ALERT_TAGS_URL,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetAlertTagsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { tags, ids } = request.body;
        const core = await context.core;
        const securitySolution = await context.securitySolution;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const siemClient = securitySolution?.getAppClient();
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validateAlertTagsArrays(tags, ids);
        const spaceId = securitySolution?.getSpaceId() ?? 'default';

        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const tagsToAdd = uniq(tags.tags_to_add);
        const tagsToRemove = uniq(tags.tags_to_remove);

        const painlessScript = {
          params: { tagsToAdd, tagsToRemove },
          source: `List newTagsArray = [];
        if (ctx._source["kibana.alert.workflow_tags"] != null) {
          for (tag in ctx._source["kibana.alert.workflow_tags"]) {
            if (!params.tagsToRemove.contains(tag)) {
              newTagsArray.add(tag);
            }
          }
          for (tag in params.tagsToAdd) {
            if (!newTagsArray.contains(tag)) {
              newTagsArray.add(tag)
            }
          }
          ctx._source["kibana.alert.workflow_tags"] = newTagsArray;
        } else {
          ctx._source["kibana.alert.workflow_tags"] = params.tagsToAdd;
        }
        `,
          lang: 'painless',
        };

        const bulkUpdateRequest = [];
        for (const id of ids) {
          bulkUpdateRequest.push(
            {
              update: {
                _index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
                _id: id,
              },
            },
            {
              script: painlessScript,
            }
          );
        }

        try {
          const body = await esClient.updateByQuery({
            index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
            refresh: true,
            body: {
              script: painlessScript,
              query: {
                bool: {
                  filter: { terms: { _id: ids } },
                },
              },
            },
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
