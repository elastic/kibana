/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { NOTE_URL } from '../../../../../common/constants';

import type { SetupPlugins } from '../../../../plugin';
import { buildRouteValidationWithExcess } from '../../../../utils/build_validation/route_validation';
import type { ConfigType } from '../../../..';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../utils/common';
import { deleteNoteSchema } from '../../schemas/notes';
import { deleteNote } from '../../saved_object/notes';

export const deleteNoteRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.delete(
    {
      path: NOTE_URL,
      validate: {
        body: buildRouteValidationWithExcess(deleteNoteSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const noteId = request.body?.noteId ?? '';

        const res = await deleteNote({
          request: frameworkRequest,
          noteId,
        });

        return response.ok({
          body: { data: { persistNote: res } },
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
