/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithExcess } from '../../../../../utils/build_validation/route_validation';
import type { ConfigType } from '../../../../..';
import { deleteTimelinesSchema } from '../../../schemas/timelines/delete_timelines_schema';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import type { SetupPlugins } from '../../../../../plugin';
import { TIMELINE_URL } from '../../../../../../common/constants';
import { buildSiemResponse } from '../../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../utils/common';
import { deleteTimeline } from '../../../saved_object/timelines';

export const deleteTimelinesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.delete(
    {
      path: TIMELINE_URL,
      validate: {
        body: buildRouteValidationWithExcess(deleteTimelinesSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const { savedObjectIds } = request.body;

        await deleteTimeline(frameworkRequest, savedObjectIds);
        return response.ok({ body: { data: { deleteTimeline: true } } });
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
