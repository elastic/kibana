/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { LegacyAPICaller } from 'src/core/server';
import { serializeProvider } from '../../../../../../src/plugins/expressions/common';
import { RouteInitializerDeps } from '../';
import { API_ROUTE_FUNCTIONS } from '../../../common/lib/constants';

export function initializeGetFunctionsRoute(deps: RouteInitializerDeps) {
  const { router, expressions } = deps;
  router.get(
    {
      path: API_ROUTE_FUNCTIONS,
      validate: false,
    },
    async (context, request, response) => {
      const functions = expressions.getFunctions();
      const body = JSON.stringify(functions);
      return response.ok({
        body,
      });
    }
  );
}

export function initializeBatchFunctionsRoute(deps: RouteInitializerDeps) {
  const { bfetch, elasticsearch, expressions } = deps;

  /**
   * Run a single Canvas function.
   *
   * @param {*} server - The Kibana server object
   * @param {*} handlers - The Canvas handlers
   * @param {*} fnCall - Describes the function being run `{ functionName, args, context }`
   */
  async function runFunction(
    handlers: { environment: string; elasticsearchClient: LegacyAPICaller },
    fnCall: any
  ) {
    const { functionName, args, context } = fnCall;
    const { deserialize } = serializeProvider(expressions.getTypes());
    const fnDef = expressions.getFunctions()[functionName];
    if (!fnDef) throw Boom.notFound(`Function "${functionName}" could not be found.`);
    const deserialized = deserialize(context);
    const result = fnDef.fn(deserialized, args, handlers);
    return result;
  }

  /**
   * Register an endpoint that executes a batch of functions, and streams the
   * results back using ND-JSON.
   */
  bfetch.addBatchProcessingRoute(API_ROUTE_FUNCTIONS, (request) => {
    return {
      onBatchItem: async (fnCall: any) => {
        const handlers = {
          environment: 'server',
          elasticsearchClient: elasticsearch.legacy.client.asScoped(request).callAsCurrentUser,
        };
        const result = await runFunction(handlers, fnCall);
        if (typeof result === 'undefined') {
          throw new Error(`Function ${fnCall.functionName} did not return anything.`);
        }
        return result;
      },
    };
  });
}
