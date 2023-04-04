/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import seedrandom from 'seedrandom';

import {
  GetHostsRequestParamsRT,
  GetHostsRequestParams,
  GetHostsResponsePayloadRT,
} from '../../../common/http_api/hosts';
import { InfraBackendLibs } from '../../lib/infra_types';
import { getHostsList } from './lib/get_hosts_list';

export const initHostsRoute = (libs: InfraBackendLibs) => {
  const validateParams = createRouteValidationFunction(GetHostsRequestParamsRT);

  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/hosts',
      validate: {
        body: validateParams,
      },
    },
    async (context, request, response) => {
      const [{ savedObjects }, { data, security }] = await libs.getStartServices();
      const params: GetHostsRequestParams = request.body;

      const searchClient = data.search.asScoped(request);
      const soClient = savedObjects.getScopedClient(request);
      const source = await libs.sources.getSourceConfiguration(soClient, params.sourceId);

      const username = security.authc.getCurrentUser(request)?.username;
      const seed = username ? Math.abs(seedrandom(username).int32()) : 1;

      try {
        const hosts = await getHostsList({ searchClient, source, params, seed });

        return response.ok({
          body: GetHostsResponsePayloadRT.encode(hosts),
        });
      } catch (err) {
        return response.customError({
          statusCode: err.statusCode ?? err,
          body: {
            message: err.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};
