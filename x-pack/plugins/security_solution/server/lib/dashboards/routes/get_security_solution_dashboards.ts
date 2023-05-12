/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import { INTERNAL_DASHBOARDS_URL } from '../../../../common/constants';
import type { SetupPlugins } from '../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../timeline/utils/common';
import { getSecuritySolutionDashboards } from '../helpers';

export const getSecuritySolutionDashboardsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: INTERNAL_DASHBOARDS_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const frameworkRequest = await buildFrameworkRequest(context, security, request);
      const savedObjectsClient = (await frameworkRequest.context.core).savedObjects.client;

      const { response: dashboards, error } = await getSecuritySolutionDashboards({
        logger,
        savedObjectsClient,
      });
      if (!error && dashboards != null) {
        return response.ok({ body: dashboards });
      } else {
        return siemResponse.error({
          statusCode: error?.statusCode ?? 500,
          body: i18n.translate(
            'xpack.securitySolution.dashboards.getSecuritySolutionDashboardsErrorTitle',
            {
              values: { message: error?.message },
              defaultMessage: `Failed to get dashboards - {message}`,
            }
          ),
        });
      }
    }
  );
};
