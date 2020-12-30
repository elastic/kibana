/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';

import { CasesStatusResponseRt, caseStatuses } from '../../../../../common/api';
import { CASE_SAVED_OBJECT } from '../../../../saved_object_types';
import { CASE_STATUS_URL } from '../../../../../common/constants';

export function initGetCasesStatusApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: CASE_STATUS_URL,
      validate: {},
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const args = caseStatuses.map((status) => ({
          client,
          options: {
            fields: [],
            page: 1,
            perPage: 1,
            filter: `${CASE_SAVED_OBJECT}.attributes.status: ${status}`,
          },
        }));

        const [openCases, inProgressCases, closesCases] = await Promise.all(
          args.map((arg) => caseService.findCases(arg))
        );

        return response.ok({
          body: CasesStatusResponseRt.encode({
            count_open_cases: openCases.total,
            count_in_progress_cases: inProgressCases.total,
            count_closed_cases: closesCases.total,
          }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
