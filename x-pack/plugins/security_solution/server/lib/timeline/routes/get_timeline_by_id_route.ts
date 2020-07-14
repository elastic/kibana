/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../src/core/server';

import { TIMELINE_URL } from '../../../../common/constants';

import { ConfigType } from '../../..';
import { SetupPlugins } from '../../../plugin';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';

import { buildSiemResponse, transformError } from '../../detection_engine/routes/utils';

import { buildFrameworkRequest } from './utils/common';
import { getTimelineByIdSchemaQuery } from './schemas/get_timeline_by_id_schema';
import { getTimeline, getTemplateTimeline } from './utils/create_timelines';

export const getTimelineByIdRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: `${TIMELINE_URL}`,
      validate: { query: buildRouteValidation(getTimelineByIdSchemaQuery) },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const { template_timeline_id: templateTimelineId, id } = request.query;
        let res = null;
        if (templateTimelineId != null) {
          res = await getTemplateTimeline(frameworkRequest, templateTimelineId);
        } else if (id != null) {
          res = await getTimeline(frameworkRequest, id);
        }

        return response.ok({ body: res ?? {} });
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
