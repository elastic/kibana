/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';

import { INTERNAL_TAGS_URL, SECURITY_TAG_NAME } from '../../../../common/constants';
import type { SetupPlugins } from '../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildSiemResponse } from '../../detection_engine/routes/utils';
import { buildFrameworkRequest } from '../../timeline/utils/common';
import { getOrCreateSecurityTag } from '../helpers';

export const getSecuritySolutionTagsRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: INTERNAL_TAGS_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const frameworkRequest = await buildFrameworkRequest(context, security, request);
      const savedObjectsClient = (await frameworkRequest.context.core).savedObjects.client;

      const { response: tags, error } = await getOrCreateSecurityTag({
        logger,
        savedObjectsClient,
      });

      if (tags && !error) {
        return response.ok({
          body: tags.map(({ id, attributes: { name, description, color } }) => ({
            id,
            name,
            description,
            color,
          })),
        });
      } else {
        return siemResponse.error({
          statusCode: error?.statusCode ?? 500,
          body: i18n.translate(
            'xpack.securitySolution.dashboards.getSecuritySolutionTagsErrorTitle',
            {
              values: { tagName: SECURITY_TAG_NAME, message: error?.message },
              defaultMessage: `Failed to create {tagName} tag - {message}`,
            }
          ),
        });
      }
    }
  );
};
