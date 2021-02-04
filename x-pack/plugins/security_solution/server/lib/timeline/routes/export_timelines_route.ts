/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_EXPORT_URL } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { ConfigType } from '../../../config';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';

import { getExportTimelineByObjectIds } from './utils/export_timelines';
import {
  exportTimelinesQuerySchema,
  exportTimelinesRequestBodySchema,
} from './schemas/export_timelines_schema';
import { buildRouteValidationWithExcess } from '../../../utils/build_validation/route_validation';
import { buildFrameworkRequest } from './utils/common';
import { SetupPlugins } from '../../../plugin';

export const exportTimelinesRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: TIMELINE_EXPORT_URL,
      validate: {
        query: buildRouteValidationWithExcess(exportTimelinesQuerySchema),
        body: buildRouteValidationWithExcess(exportTimelinesRequestBodySchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      try {
        const siemResponse = buildSiemResponse(response);
        const frameworkRequest = await buildFrameworkRequest(context, security, request);

        const exportSizeLimit = config.maxTimelineImportExportSize;

        if (request.body?.ids != null && request.body.ids.length > exportSizeLimit) {
          return siemResponse.error({
            statusCode: 400,
            body: `Can't export more than ${exportSizeLimit} timelines`,
          });
        }

        const responseBody = await getExportTimelineByObjectIds({
          frameworkRequest,
          ids: request.body?.ids,
        });

        return response.ok({
          headers: {
            'Content-Disposition': `attachment; filename="${request.query.file_name}"`,
            'Content-Type': 'application/ndjson',
          },
          body: responseBody,
        });
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
