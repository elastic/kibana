/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';

import { CasesStatusResponseRt, caseStatuses } from '../../../../../common';
import { CASE_STATUS_URL } from '../../../../../common';
import { constructQueryOptions } from '../helpers';

export function initGetCasesStatusApi({ caseService, router, logger }: RouteDeps) {
  router.get(
    {
      path: CASE_STATUS_URL,
      validate: {},
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;

        const [openCases, inProgressCases, closedCases] = await Promise.all([
          ...caseStatuses.map((status) => {
            const statusQuery = constructQueryOptions({ status });
            return caseService.findCaseStatusStats({
              client,
              caseOptions: statusQuery.case,
              subCaseOptions: statusQuery.subCase,
            });
          }),
        ]);

        return response.ok({
          body: CasesStatusResponseRt.encode({
            count_open_cases: openCases,
            count_in_progress_cases: inProgressCases,
            count_closed_cases: closedCases,
          }),
        });
      } catch (error) {
        logger.error(`Failed to get status stats in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
