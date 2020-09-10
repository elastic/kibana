/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouteDependencies } from '../../plugin';

export function registerWSOverviewRoute({
  router,
  enterpriseSearchRequestHandler,
}: IRouteDependencies) {
  router.get(
    {
      path: '/api/workplace_search/overview',
      validate: false,
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/ws/org',
      hasValidData: (body: { accountsCount: number }) => typeof body?.accountsCount === 'number',
    })
  );
}
