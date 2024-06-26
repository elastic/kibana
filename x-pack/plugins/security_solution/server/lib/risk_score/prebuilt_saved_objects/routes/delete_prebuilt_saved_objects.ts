/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import { PREBUILT_SAVED_OBJECTS_BULK_DELETE } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../timeline/utils/common';
import { bulkDeleteSavedObjects } from '../helpers/bulk_delete_saved_objects';
import { deletePrebuiltSavedObjectsRequestBody } from '../../../../../common/api/entity_analytics/risk_score';

export const deletePrebuiltSavedObjectsRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: PREBUILT_SAVED_OBJECTS_BULK_DELETE,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      { validate: { request: deletePrebuiltSavedObjectsRequestBody }, version: '1' },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const { template_name: templateName } = request.params;
        const deleteAll = request?.body?.deleteAll;

        try {
          const securitySolution = await context.securitySolution;

          const spaceId = securitySolution?.getSpaceId();

          const frameworkRequest = await buildFrameworkRequest(context, request);
          const savedObjectsClient = (await frameworkRequest.context.core).savedObjects.client;

          const res = await bulkDeleteSavedObjects({
            deleteAll,
            savedObjectsClient,
            spaceId,
            savedObjectTemplate: templateName,
          });

          return response.ok({
            body: res,
          });
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
