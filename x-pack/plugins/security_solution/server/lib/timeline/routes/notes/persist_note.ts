/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import { NOTE_URL } from '../../../../../common/constants';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../utils/common';
import {
  PersistNoteRouteRequestBody,
  type PersistNoteRouteResponse,
} from '../../../../../common/api/timeline';
import { persistNote } from '../../saved_object/notes';

export const persistNoteRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .patch({
      path: NOTE_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      access: 'public',
    })
    .addVersion(
      {
        validate: {
          request: { body: buildRouteValidationWithZod(PersistNoteRouteRequestBody) },
        },
        version: '2023-10-31',
      },
      async (context, request, response): Promise<IKibanaResponse<PersistNoteRouteResponse>> => {
        const siemResponse = buildSiemResponse(response);

        try {
          const frameworkRequest = await buildFrameworkRequest(context, request);
          const { note } = request.body;
          const noteId = request.body?.noteId ?? null;

          const res = await persistNote({
            request: frameworkRequest,
            noteId,
            note,
            overrideOwner: true,
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
