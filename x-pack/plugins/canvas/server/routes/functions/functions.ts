/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeProvider } from '@kbn/expressions-plugin/common';
import { RouteInitializerDeps } from '..';
import { API_ROUTE_FUNCTIONS } from '../../../common/lib/constants';

interface FunctionCall {
  functionName: string;
  args: Record<string, any>;
  context: Record<string, any>;
}

export function initializeGetFunctionsRoute(deps: RouteInitializerDeps) {
  const { router, expressions } = deps;
  router.get(
    {
      path: API_ROUTE_FUNCTIONS,
      validate: false,
    },
    async (context, request, response) => {
      const functions = expressions.getFunctions('canvas');
      const body = JSON.stringify(functions);
      return response.ok({
        body,
      });
    }
  );
}

export function initializeBatchFunctionsRoute(deps: RouteInitializerDeps) {
  const { bfetch, expressions } = deps;

  async function runFunction(handlers: { environment: string }, fnCall: FunctionCall) {
    const { functionName, args, context } = fnCall;
    const { deserialize } = serializeProvider(expressions.getTypes());

    const fnDef = expressions.getFunctions('canvas')[functionName];
    if (!fnDef) throw new Error(`Function "${functionName}" could not be found.`);

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
      onBatchItem: async (fnCall: FunctionCall) => {
        const handlers = {
          environment: 'server',
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
