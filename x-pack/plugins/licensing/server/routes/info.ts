/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicensingRouter } from '../types';

export function registerInfoRoute(router: LicensingRouter) {
  router.get(
    { path: '/api/licensing/info', validate: false },
    async (context, request, response) => {
      return response.ok({
        body: (await context.licensing).license,
      });
    }
  );
}
