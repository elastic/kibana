/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../src/core/server';

import { TIMELINE_URL } from '../../../../common/constants';

import { SetupPlugins } from '../../../plugin';
import { ConfigType } from '../../../config';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';

import { buildSiemResponse, transformError } from '../../detection_engine/routes/utils';

import { buildFrameworkRequest } from './utils/common';
import { getTimelineByTemplateTimelineIdSchemaQuery } from './schemas/get_timeline_by_template_timeline_id_schema';
import { getTemplateTimeline } from './utils/create_timelines';

export const getTimelineByTemplateTimelineIdRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: `${TIMELINE_URL}`,
      validate: { query: buildRouteValidation(getTimelineByTemplateTimelineIdSchemaQuery) },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      try {
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const res = await getTemplateTimeline(frameworkRequest, request.query.template_timeline_id);

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
