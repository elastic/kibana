/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { RouteDependencies } from '../types';

export function registerTestRoutes({ router }: RouteDependencies) {
  router.post(
    {
      path: `${API_BASE_PATH}/test`,
      validate: false,
    },
    versionCheckHandlerWrapper(
      async (
        {
          core: {
            savedObjects: { client: savedObjectsClient },
            elasticsearch: { client },
          },
        },
        request,
        response
      ) => {
        return response.ok({
          body: {},
        });
      }
    )
  );
}
