/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';

import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_ALERTS_URL } from '../../../../../common/constants';

export function initGetCaseIdsByAlertIdApi({ caseService, router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_ALERTS_URL,
      validate: {
        params: schema.object({
          alert_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const alertId = request.params.alert_id;
        if (alertId == null || alertId === '') {
          throw Boom.badRequest('The `alertId` is not valid');
        }
        const client = context.core.savedObjects.client;
        const caseIds = await caseService.getCaseIdsByAlertId({
          client,
          alertId,
        });

        return response.ok({
          body: caseIds,
        });
      } catch (error) {
        logger.error(
          `Failed to retrieve case ids for this alert id: ${request.params.alert_id}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
