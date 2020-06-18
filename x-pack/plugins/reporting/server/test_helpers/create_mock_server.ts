/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createHttpServer, createCoreContext } from 'src/core/server/http/test_utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { coreMock } from 'src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ContextService } from 'src/core/server/context/context_service';

const coreId = Symbol('reporting');

export const createMockServer = async () => {
  const coreContext = createCoreContext({ coreId });
  const contextService = new ContextService(coreContext);

  const server = createHttpServer(coreContext);
  const httpSetup = await server.setup({
    context: contextService.setup({ pluginDependencies: new Map() }),
  });
  const handlerContext = coreMock.createRequestHandlerContext();

  httpSetup.registerRouteHandlerContext(coreId, 'core', async (ctx, req, res) => {
    return handlerContext;
  });

  return {
    server,
    httpSetup,
    handlerContext,
  };
};
