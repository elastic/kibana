/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '../../../../src/core/public';
import { serializeProvider } from '../../../../src/plugins/expressions/common';
import { API_ROUTE_FUNCTIONS } from '../common/lib/constants';

import { CanvasSetupDeps } from './plugin';

let cached: Promise<void> | null = null;

// TODO: clintandrewhall - This is getting refactored shortly.  https://github.com/elastic/kibana/issues/105675
export const setupExpressions = async ({
  coreSetup,
  setupPlugins,
}: {
  coreSetup: CoreSetup;
  setupPlugins: CanvasSetupDeps;
}) => {
  const { expressions, bfetch } = setupPlugins;

  const loadServerFunctionWrappers = async () => {
    if (!cached) {
      cached = (async () => {
        const serverFunctionList = await coreSetup.http.get<any>(API_ROUTE_FUNCTIONS);
        const batchedFunction = bfetch.batchedFunction({ url: API_ROUTE_FUNCTIONS });
        const { serialize } = serializeProvider(expressions.getTypes());

        // For every sever-side function, register a client-side
        // function that matches its definition, but which simply
        // calls the server-side function endpoint.
        Object.keys(serverFunctionList).forEach((functionName) => {
          if (expressions.getFunction(functionName)) {
            return;
          }

          const fn = () => ({
            ...serverFunctionList[functionName],
            fn: (input: any, args: any) => {
              return batchedFunction({ functionName, args, context: serialize(input) });
            },
          });

          expressions.registerFunction(fn);
        });
      })();
    }
    return cached;
  };

  await loadServerFunctionWrappers();
};
