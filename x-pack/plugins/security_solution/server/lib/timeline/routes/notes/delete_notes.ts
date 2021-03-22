/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithExcess } from '../../../../utils/build_validation/route_validation';
import { ConfigType } from '../../../..';
import { deletNotesSchema } from '../../schemas/notes/delete_notes_schema';
import { SecuritySolutionPluginRouter } from '../../../../types';
import { SetupPlugins } from '../../../../plugin';
import { NOTE_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse } from '../../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../utils/common';
import { deleteTimeline } from '../../saved_object/timelines';

export const deletNotesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.delete(
    {
      path: NOTE_URL,
      validate: {
        body: buildRouteValidationWithExcess(deletNotesSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const { id } = request.body;

        await deleteTimeline(frameworkRequest, id);
        return response.ok();
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
