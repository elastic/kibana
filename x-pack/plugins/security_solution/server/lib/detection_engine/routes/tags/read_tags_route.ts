/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_TAGS_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse } from '../utils';
import { readTags } from '../../tags/read_tags';

export const readTagsRoute = (router: IRouter) => {
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
