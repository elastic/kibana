/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ReadTagsResponse } from '../../../../../../../common/api/detection_engine';
import { DETECTION_ENGINE_TAGS_URL } from '../../../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildSiemResponse } from '../../../../routes/utils';
import { readTags } from './read_tags';

export const readTagsRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .get({
      access: 'public',
      path: DETECTION_ENGINE_TAGS_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      async (context, request, response): Promise<IKibanaResponse<ReadTagsResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const ctx = await context.resolve(['alerting']);
        const rulesClient = ctx.alerting.getRulesClient();

        try {
          const tags = await readTags({
            rulesClient,
          });
          return response.ok({ body: tags });
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
