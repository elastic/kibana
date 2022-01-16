/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, IRouter, RequestHandlerContext } from 'src/core/server';
import { CspServerPluginStartDeps } from '../../types';
import { BENCHMARKS_ROUTE_PATH } from '../../../common/constants';

interface HandlerContext extends RequestHandlerContext, CspServerPluginStartDeps {}

export const defineGetBenchmarksRoute = (router: IRouter<HandlerContext>): void =>
  router.get(
    {
      path: BENCHMARKS_ROUTE_PATH,
      validate: false,
      //   query:
    },
    async (context, _, response) => {
      try {
        console.log('1111');
        // const esClient = context.core.elasticsearch.client.asCurrentUser;
        const soClient = context.core.savedObjects.client;
        console.log('22222');
        // console.log('22222');
        // const { full: withPackagePolicies = false, ...restOfQuery } = request.query;
        // export const agentPolicyService = new AgentPolicyService();
        const agentPolicyService = context.fleet.agentPolicyService;
        const { items, total, page, perPage } = await agentPolicyService.list(soClient, {
          withPackagePolicies: true,
        });
        const body = {
          items,
          total,
          page,
          perPage,
        };

        return response.ok({
          body,
        });
      } catch (err) {
        // TODO - validate err object and parse
        return response.customError({ body: { message: err.message }, statusCode: 500 });
      }
    }
  );
