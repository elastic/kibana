/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { firstValueFrom, lastValueFrom } from 'rxjs';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { throwErrors } from '@kbn/cases-plugin/common';

import { IKibanaSearchResponse, ISearchOptionsSerializable } from '@kbn/data-plugin/common';
import { GetHostsRequestParamsRT, GetHostsRequestParams } from '../../../common/http_api/hosts';
import { InfraBackendLibs } from '../../lib/infra_types';
import { fetchHostsMetrics } from '../../lib/hosts/fetch_hosts_metrics';

interface HostsBatchRequest {
  request: {
    id?: string;
    params: GetHostsRequestParams;
  };
  options: ISearchOptionsSerializable;
}

export const initHostsRoute = (libs: InfraBackendLibs) => {
  const validateParams = createRouteValidationFunction(GetHostsRequestParamsRT);

  const { framework } = libs;

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/hosts',
      validate: {},
    },
    async (context, request, response) => {
      const [{ savedObjects }, { data }] = await libs.getStartServices();
      const params = request.body as any;

      const search = data.search.asScoped(request);
      const soClient = savedObjects.getScopedClient(request);
      const source = await libs.sources.getSourceConfiguration(soClient, params.sourceId);

      const res = await lastValueFrom(fetchHostsMetrics(search, source, params));
      return response.ok({
        body: res.rawResponse,
      });
    }
  );

  framework.plugins.bfetch.addBatchProcessingRoute<HostsBatchRequest, IKibanaSearchResponse<any>>(
    '/api/metrics/hosts/batch',
    (request) => {
      return {
        onBatchItem: async ({ request: requestData, options }) => {
          const params = pipe(
            GetHostsRequestParamsRT.decode(requestData.params),
            fold(throwErrors(Boom.badRequest), identity)
          );

          const [{ executionContext, savedObjects }, { data }] = await libs.getStartServices();
          const { id } = requestData;

          const search = data.search.asScoped(request);
          const soClient = savedObjects.getScopedClient(request);
          const source = await libs.sources.getSourceConfiguration(soClient, params.sourceId);

          const { executionContext: ctx, ...restOptions } = options || {};

          return executionContext.withContext(ctx, async () => {
            return firstValueFrom(fetchHostsMetrics(search, source, params, restOptions, id));
          });
        },
      };
    }
  );
};
