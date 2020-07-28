/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart, KibanaRequest } from 'src/core/server';
import { GlobalSearchProviderContext } from '../types';

export type GlobalSearchContextFactory = (request: KibanaRequest) => GlobalSearchProviderContext;

/**
 * {@link GlobalSearchProviderContext | context} factory
 */
export const getContextFactory = (coreStart: CoreStart) => (
  request: KibanaRequest
): GlobalSearchProviderContext => {
  const soClient = coreStart.savedObjects.getScopedClient(request);
  return {
    core: {
      savedObjects: {
        client: soClient,
        typeRegistry: coreStart.savedObjects.getTypeRegistry(),
      },
      elasticsearch: {
        legacy: {
          client: coreStart.elasticsearch.legacy.client.asScoped(request),
        },
      },
      uiSettings: {
        client: coreStart.uiSettings.asScopedToClient(soClient),
      },
    },
  };
};
