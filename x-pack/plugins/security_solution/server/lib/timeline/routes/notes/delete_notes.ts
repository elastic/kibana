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
import { NOTES_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse } from '../../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../utils/common';
import { deletNotesByTimelineIdSchema } from '../../schemas/notes/delete_notes_by_timeline_id_schema';
import { deleteNote, deleteNoteByTimelineId } from '../../saved_object/notes';

export const deletNotesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.delete(
    {
      path: NOTES_URL,
      validate: {
        query: buildRouteValidationWithExcess(deletNotesByTimelineIdSchema),
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
        const timelineId = request.query?.timelineId ?? null;
        const ids = request.body?.ids ?? null;

        // Can only provide query or body at a time
        if (
          ((ids == null || ids.length === 0) && timelineId == null) ||
          (ids != null && ids.length > 0 && timelineId != null)
        ) {
          throw new Error(`Provide query with timelineId or body with note ids`);
        }

        if (ids != null) {
          await deleteNote(frameworkRequest, ids);
        }

        if (timelineId != null) {
          await deleteNoteByTimelineId(frameworkRequest, timelineId);
        }

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
