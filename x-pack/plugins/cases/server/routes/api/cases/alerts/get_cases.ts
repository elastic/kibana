/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import Boom from '@hapi/boom';

import { RouteDeps } from '../../types';
import { escapeHatch, wrapError } from '../../utils';
import { CASE_ALERTS_URL, CasesByAlertIDRequest } from '../../../../../common';

export function initGetCaseIdsByAlertIdApi({ router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_ALERTS_URL,
      validate: {
        params: schema.object({
          alert_id: schema.string(),
        }),
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const alertID = request.params.alert_id;
        if (alertID == null || alertID === '') {
          throw Boom.badRequest('The `alertId` is not valid');
        }
        const casesClient = await context.cases.getCasesClient();
        const options = request.query as CasesByAlertIDRequest;

        const caseIds = await casesClient.cases.getCaseIDsByAlertID({ alertID, options });

        const getCaseInfo = async () => {
          return Promise.all(
            caseIds.map(async (caseId: string) => {
              const fullCase = await casesClient.cases.get({ id: caseId });
              return {
                id: caseId,
                title: fullCase.title,
              };
            })
          );
        };

        return response.ok({
          body: await getCaseInfo(),
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
