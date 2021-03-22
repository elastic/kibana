/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../../types';

import { NOTE_URL } from '../../../../../common/constants';

import { ConfigType } from '../../../..';
import { SetupPlugins } from '../../../../plugin';
import { buildRouteValidationWithExcess } from '../../../../utils/build_validation/route_validation';

import { buildSiemResponse, transformError } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../utils/common';
import { getNoteSchema } from '../../schemas/notes/get_note_schema';
import { getNote } from '../../saved_object/notes';

export const getNoteRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: NOTE_URL,
      validate: { query: buildRouteValidationWithExcess(getNoteSchema) },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const { id } = request.query;
        const res = await getNote(frameworkRequest, id);

        return response.ok({ body: res });
      } catch (err) {
        const error = transformError(err);
        const siemResponse = buildSiemResponse(response);

        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
