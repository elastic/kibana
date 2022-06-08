/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { schema } from '@kbn/config-schema';

import type { SecuritySolutionPluginRouter } from '../../../types';

import { CREATE_DASHBOARD_ROUTE } from '../../../../common/constants';

import { SetupPlugins } from '../../../plugin';

import { buildSiemResponse } from '../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../timeline/utils/common';
import { createDashboards } from '../../timeline/saved_object/console';

const createDashboardsRouteSchema = {
  query: schema.object({
    space_id: schema.string(),
  }),
};

export const createDashboardsRoute = (
  router: SecuritySolutionPluginRouter,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: CREATE_DASHBOARD_ROUTE,
      validate: createDashboardsRouteSchema,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const { space_id: spaceId } = request.query;

      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);

        const res = await createDashboards({
          request: frameworkRequest,
          spaceId,
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
