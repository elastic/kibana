/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_TAGS_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

import { readTags } from '../../tags/read_tags';

export const readTagsRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_TAGS_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const alertsClient = context.alerting?.getAlertsClient();

      if (!alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      try {
        const tags = await readTags({
          alertsClient,
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
