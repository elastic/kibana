/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouteDependencies } from '../../plugin';
import { callEnterpriseSearchConfigAPI } from '../../lib/enterprise_search_config_api';

export function registerConfigDataRoute({ router, config, log }: IRouteDependencies) {
  router.get(
    {
      path: '/api/enterprise_search/config_data',
      validate: false,
    },
    async (context, request, response) => {
      const data = await callEnterpriseSearchConfigAPI({ request, config, log });

      if (!Object.keys(data).length) {
        return response.customError({
          statusCode: 502,
          body: 'Error fetching data from Enterprise Search',
        });
      } else {
        return response.ok({
          body: data,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
  );
}
