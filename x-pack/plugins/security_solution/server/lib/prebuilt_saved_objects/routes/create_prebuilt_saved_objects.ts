/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';

import type { SecuritySolutionPluginRouter } from '../../../types';

import { BULK_CREATE_SAVED_OBJECTS_ROUTE } from '../../../../common/constants';

import { SetupPlugins } from '../../../plugin';

import { buildSiemResponse } from '../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../timeline/utils/common';
import { bulkCreateSavedObjects } from '../helpers/bulk_create_saved_objects';

export const createPrebuiltSavedObjectsSchema = {
  params: schema.object({
    template_name: schema.string(),
  }),
};

export const createPrebuiltSavedObjectsRoute = (
  router: SecuritySolutionPluginRouter,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: BULK_CREATE_SAVED_OBJECTS_ROUTE,
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

        const res = await bulkCreateSavedObjects({
          request: frameworkRequest,
          spaceId,
          savedObjectTemplate: templateName,
        });

        return response.ok({
          body: { data: { createDashboards: res } },
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
