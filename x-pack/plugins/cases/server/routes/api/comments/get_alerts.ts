/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDeps } from '../types';
import { wrapError } from '../utils';
import { CASE_DETAILS_ALERTS_URL } from '../../../../common/constants';

export function initGetAllAlertsAttachToCaseApi({ router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_DETAILS_ALERTS_URL,
      validate: {
        params: schema.object({
          case_id: schema.string({ minLength: 1 }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const caseId = request.params.case_id;

        const casesClient = await context.cases.getCasesClient();

        return response.ok({
          body: await casesClient.attachments.getAllAlertsAttachToCase({ caseId }),
        });
      } catch (error) {
        logger.error(
          `Failed to retrieve alert ids for this case id: ${request.params.case_id}: ${error}`
        );
        return response.customError(wrapError(error));
      }
    }
  );
}
