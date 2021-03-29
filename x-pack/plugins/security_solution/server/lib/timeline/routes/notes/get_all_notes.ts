/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { filter } from 'lodash';

import type { SecuritySolutionPluginRouter } from '../../../../types';

import { NOTES_URL } from '../../../../../common/constants';

import { ConfigType } from '../../../..';
import { SetupPlugins } from '../../../../plugin';
import { buildRouteValidationWithExcess } from '../../../../utils/build_validation/route_validation';

import { buildSiemResponse, transformError } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../utils/common';
import { getAllNotesSchema, getNotesSchema } from '../../schemas/notes/get_all_notes_schema';
import { getAllNotes, getNotesByEventId, getNotesByTimelineId } from '../../saved_object/notes';
export const getAllNotesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: NOTES_URL,
      validate: {
        query: buildRouteValidationWithExcess(getNotesSchema),
        body: buildRouteValidationWithExcess(getAllNotesSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const eventId = request.query?.eventId ?? null;
        const timelineId = request.query?.timelineId ?? null;
        const pageInfo = request.body?.pageInfo ?? null;
        const search = request.body?.search ?? null;
        const sort = request.body?.sort ?? null;

        const args = filter(
          [
            { name: 'eventId', value: eventId },
            { name: 'timelineId', value: timelineId },
          ],
          (arg) => arg.value != null
        );

        let res = null;

        if (args.length === 2) {
          throw new Error(
            `Can not retrieving notes with more than one indices: ${args
              .map((arg) => `${arg.name} = ${arg.value}`)
              .join('and ')}, please remove one of them.`
          );
        } else if (args.length === 0) {
          res = await getAllNotes(frameworkRequest, pageInfo, search, sort);
        } else {
          if (eventId != null) {
            res = await getNotesByEventId(frameworkRequest, eventId);
          } else if (timelineId != null) {
            res = await getNotesByTimelineId(frameworkRequest, timelineId);
          }
        }

        return response.ok({ body: res ?? [] });
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
