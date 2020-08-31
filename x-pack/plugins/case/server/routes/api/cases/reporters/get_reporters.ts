/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UsersRt } from '../../../../../common/api';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_REPORTERS_URL } from '../../../../../common/constants';

export function initGetReportersApi({ caseService, router }: RouteDeps) {
  router.get(
    {
      path: CASE_REPORTERS_URL,
      validate: {},
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const reporters = await caseService.getReporters({
          client,
        });
        return response.ok({ body: UsersRt.encode(reporters) });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
