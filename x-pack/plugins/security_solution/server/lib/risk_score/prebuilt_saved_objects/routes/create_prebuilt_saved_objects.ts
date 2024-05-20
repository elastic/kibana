/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { PREBUILT_SAVED_OBJECTS_BULK_CREATE } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import type { SetupPlugins } from '../../../../plugin';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';

import { buildFrameworkRequest } from '../../../timeline/utils/common';
import { bulkCreateSavedObjects } from '../helpers/bulk_create_saved_objects';
import { createPrebuiltSavedObjectsRequestBody } from '../../../../../common/api/entity_analytics/risk_score';

export const createPrebuiltSavedObjectsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  security: SetupPlugins['security']
) => {
  router.versioned
    .post({
      access: 'internal',
      path: PREBUILT_SAVED_OBJECTS_BULK_CREATE,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        validate: {
          request: createPrebuiltSavedObjectsRequestBody,
        },
        version: '1',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const { template_name: templateName } = request.params;

        const securitySolution = await context.securitySolution;

        const spaceId = securitySolution?.getSpaceId();

        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const savedObjectsClient = (await frameworkRequest.context.core).savedObjects.client;
        const result = await bulkCreateSavedObjects({
          savedObjectsClient,
          logger,
          spaceId,
          savedObjectTemplate: templateName,
        });
        const error =
          result?.hostRiskScoreDashboards?.error || result?.userRiskScoreDashboards?.error;
        if (error != null) {
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        } else {
          return response.ok({ body: result });
        }
      }
    );
};
