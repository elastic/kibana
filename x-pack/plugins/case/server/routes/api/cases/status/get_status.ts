/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';

import { CasesStatusResponseRt } from '../../../../../common/api';
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
        const argsOpenCases = {
          client,
          options: {
            fields: [],
            page: 1,
            perPage: 1,
            filter: `${CASE_SAVED_OBJECT}.attributes.status: open`,
          },
        };

        const argsClosedCases = {
          client,
          options: {
            fields: [],
            page: 1,
            perPage: 1,
            filter: `${CASE_SAVED_OBJECT}.attributes.status: closed`,
          },
        };

        const [openCases, closesCases] = await Promise.all([
          caseService.findCases(argsOpenCases),
          caseService.findCases(argsClosedCases),
        ]);

        return response.ok({
          body: CasesStatusResponseRt.encode({
            count_open_cases: openCases.total,
            count_closed_cases: closesCases.total,
          }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
