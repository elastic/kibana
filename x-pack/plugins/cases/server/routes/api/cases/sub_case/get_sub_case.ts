/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { SubCaseResponseRt } from '../../../../../common';
import { RouteDeps } from '../../types';
import { flattenSubCaseSavedObject, wrapError } from '../../utils';
import { SUB_CASE_DETAILS_URL } from '../../../../../common';
import { countAlertsForID } from '../../../../common';

export function initGetSubCaseApi({ caseService, router, logger }: RouteDeps) {
  router.get(
    {
      path: SUB_CASE_DETAILS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string(),
          sub_case_id: schema.string(),
        }),
        query: schema.object({
          includeComments: schema.boolean({ defaultValue: true }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const includeComments = request.query.includeComments;

        const subCase = await caseService.getSubCase({
          client,
          id: request.params.sub_case_id,
        });

        if (!includeComments) {
          return response.ok({
            body: SubCaseResponseRt.encode(
              flattenSubCaseSavedObject({
                savedObject: subCase,
              })
            ),
          });
        }

        const theComments = await caseService.getAllSubCaseComments({
          client,
          id: request.params.sub_case_id,
          options: {
            sortField: 'created_at',
            sortOrder: 'asc',
          },
        });

        return response.ok({
          body: SubCaseResponseRt.encode(
            flattenSubCaseSavedObject({
              savedObject: subCase,
              comments: theComments.saved_objects,
              totalComment: theComments.total,
              totalAlerts: countAlertsForID({
                comments: theComments,
                id: request.params.sub_case_id,
              }),
            })
          ),
        });
      } catch (error) {
        logger.error(
          `Failed to get sub case in route case id: ${request.params.case_id} sub case id: ${request.params.sub_case_id} include comments: ${request.query?.includeComments}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
