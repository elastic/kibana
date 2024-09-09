/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { uniq } from 'lodash/fp';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { SetAlertAssigneesRequestBody } from '../../../../../common/api/detection_engine/alert_assignees';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { validateAlertAssigneesArrays } from './helpers';

export const setAlertAssigneesRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_ALERT_ASSIGNEES_URL,
      access: 'public',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SetAlertAssigneesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { assignees, ids } = request.body;
        const core = await context.core;
        const securitySolution = await context.securitySolution;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validateAlertAssigneesArrays(assignees);
        const spaceId = securitySolution?.getSpaceId() ?? 'default';

        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        const assigneesToAdd = uniq(assignees.add);
        const assigneesToRemove = uniq(assignees.remove);

        const painlessScript = {
          params: { assigneesToAdd, assigneesToRemove },
          source: `List newAssigneesArray = [];
        if (ctx._source["kibana.alert.workflow_assignee_ids"] != null) {
          for (assignee in ctx._source["kibana.alert.workflow_assignee_ids"]) {
            if (!params.assigneesToRemove.contains(assignee)) {
              newAssigneesArray.add(assignee);
            }
          }
          for (assignee in params.assigneesToAdd) {
            if (!newAssigneesArray.contains(assignee)) {
              newAssigneesArray.add(assignee)
            }
          }
          ctx._source["kibana.alert.workflow_assignee_ids"] = newAssigneesArray;
        } else {
          ctx._source["kibana.alert.workflow_assignee_ids"] = params.assigneesToAdd;
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
