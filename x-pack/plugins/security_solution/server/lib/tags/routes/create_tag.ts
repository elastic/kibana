/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import { transformError } from '@kbn/securitysolution-es-utils';
import { createTagRequest } from '../../../../common/api/tags';
import { INTERNAL_TAGS_URL } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildRouteValidationWithExcess } from '../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../timeline/utils/common';
import { createTag } from '../saved_objects';

export const createTagRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .put({
      path: INTERNAL_TAGS_URL,
      access: 'internal',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { body: buildRouteValidationWithExcess(createTagRequest) } },
      },
      async (context, request, response) => {
        const frameworkRequest = await buildFrameworkRequest(context, request);
        const savedObjectsClient = (await frameworkRequest.context.core).savedObjects.client;
        const { name: tagName, description, color } = request.body;
        try {
          const tag = await createTag({
            savedObjectsClient,
            tagName,
            description,
            color,
          });
          return response.ok({ body: tag });
        } catch (err) {
          const error = transformError(err);
          logger.error(`Failed to create ${tagName} tag - ${JSON.stringify(error.message)}`);

          const siemResponse = buildSiemResponse(response);
          return siemResponse.error({
            statusCode: error.statusCode ?? 500,
            body: i18n.translate(
              'xpack.securitySolution.dashboards.createSecuritySolutionTagErrorTitle',
              {
                values: { tagName, message: error.message },
                defaultMessage: `Failed to create {tagName} tag - {message}`,
              }
            ),
          });
        }
      }
    );
};
