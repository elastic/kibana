/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CanvasServiceFactory } from '.';
import {
  ExpressionsService,
  serializeProvider,
} from '../../../../../src/plugins/expressions/common';
import { API_ROUTE_FUNCTIONS } from '../../common/lib/constants';

export const expressionsServiceFactory: CanvasServiceFactory<ExpressionsService> = async (
  coreSetup,
  coreStart,
  setupPlugins,
  startPlugins
) => {
  const { expressions, bfetch } = setupPlugins;

  let cached: Promise<void> | null = null;
  const loadServerFunctionWrappers = async () => {
    if (!cached) {
      cached = (async () => {
        const labService = startPlugins.presentationUtil.labsService;
        const hasDataSearch = labService.isProjectEnabled('labs:canvas:useDataService');
        const dataSearchFns = ['essql', 'esdocs', 'escount'];

        const serverFunctionList = await coreSetup.http.get(API_ROUTE_FUNCTIONS);
        const batchedFunction = bfetch.batchedFunction({ url: API_ROUTE_FUNCTIONS });
        const { serialize } = serializeProvider(expressions.getTypes());

        // For every sever-side function, register a client-side
        // function that matches its definition, but which simply
        // calls the server-side function endpoint.
        Object.keys(serverFunctionList).forEach((functionName) => {
          // Allow function to be overwritten if we want to use
          // the server-hosted essql, esdocs, and escount functions
          if (dataSearchFns.includes(functionName)) {
            if (hasDataSearch && expressions.getFunction(functionName)) {
              return;
            }
          } else if (expressions.getFunction(functionName)) {
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

  return setupPlugins.expressions.fork();
};
