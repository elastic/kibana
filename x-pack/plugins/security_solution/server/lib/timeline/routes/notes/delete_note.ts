/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { NOTE_URL } from '../../../../../common/constants';

import { buildRouteValidationWithExcess } from '../../../../utils/build_validation/route_validation';
import type { ConfigType } from '../../../..';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../utils/common';
import { deleteNoteSchema } from '../../../../../common/api/timeline';
import { deleteNote } from '../../saved_object/notes';

export const deleteNoteRoute = (router: SecuritySolutionPluginRouter, config: ConfigType) => {
  router.versioned
    .delete({
      path: NOTE_URL,
      options: {
        tags: ['access:securitySolution'],
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: { body: buildRouteValidationWithExcess(deleteNoteSchema) },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const noteId = request.body?.noteId ?? '';
          const noteIds = request.body?.noteIds ?? null;
          if (noteIds != null) {
            await deleteNote({
              request: frameworkRequest,
              noteIds,
            });

            return response.ok({
              body: { data: {} },
            });
          } else {
            await deleteNote({
              request: frameworkRequest,
              noteIds: [noteId],
            });

            return response.ok({
              body: { data: {} },
            });
          }
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
