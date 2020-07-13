/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouteDependencies } from '../../plugin';
import { callEnterpriseSearchConfigAPI } from '../../lib/enterprise_search_config_api';

export function registerPublicUrlRoute({ router, config, log }: IRouteDependencies) {
  router.get(
    {
      path: '/api/enterprise_search/public_url',
      validate: false,
    },
    async (context, request, response) => {
      const { publicUrl = '' } =
        (await callEnterpriseSearchConfigAPI({ request, config, log })) || {};

      return response.ok({
        body: { publicUrl },
        headers: { 'content-type': 'application/json' },
      });
    }
  );
}
