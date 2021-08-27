/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { NOTE_URL } from '../../../../../common/constants';

import { SetupPlugins } from '../../../../plugin';
import { buildRouteValidationWithExcess } from '../../../../utils/build_validation/route_validation';
import { ConfigType } from '../../../..';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../utils/common';
import { persistNoteSchema } from '../../schemas/notes';
import { persistNote } from '../../saved_object/notes';

export const persistNoteRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.patch(
    {
      path: NOTE_URL,
      validate: {
        body: buildRouteValidationWithExcess(persistNoteSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const { note } = request.body;
        const noteId = request.body?.noteId ?? null;
        const version = request.body?.version ?? null;

        const res = await persistNote(
          frameworkRequest,
          noteId,
          version,
          {
            ...note,
            timelineId: note.timelineId || null,
          },
          true
        );

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
