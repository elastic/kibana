/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersRt } from '../../../../../common';
import { RouteDeps } from '../../types';
import { wrapError } from '../../utils';
import { CASE_REPORTERS_URL } from '../../../../../common';

export function initGetReportersApi({ caseService, router, logger }: RouteDeps) {
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
        logger.error(`Failed to get reporters in route: ${error}`);
        return response.customError(wrapError(error));
      }
    }
  );
}
