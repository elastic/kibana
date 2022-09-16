/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';

import { PREBUILT_SAVED_OBJECTS_BULK_CREATE } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import type { SetupPlugins } from '../../../../plugin';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../timeline/utils/common';
import { bulkCreateSavedObjects } from '../helpers/bulk_create_saved_objects';
import { createPrebuiltSavedObjectsSchema } from '../schema';

export const createPrebuiltSavedObjectsRoute = (
  router: SecuritySolutionPluginRouter,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: PREBUILT_SAVED_OBJECTS_BULK_CREATE,
      validate: createPrebuiltSavedObjectsSchema,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const { template_name: templateName } = request.params;

      try {
        const securitySolution = await context.securitySolution;

        const spaceId = securitySolution?.getSpaceId();

        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const savedObjectsClient = (await frameworkRequest.context.core).savedObjects.client;

        const res = await bulkCreateSavedObjects({
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
