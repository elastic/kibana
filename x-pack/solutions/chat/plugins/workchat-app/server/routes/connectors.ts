/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getConnectorList } from '@kbn/wc-genai-utils';
import type { ListConnectorsResponse } from '../../common/http_api/connectors';
import type { RouteDependencies } from './types';
import { apiCapabilities } from '../../common/features';
import { getHandlerWrapper } from './wrap_handler';

export const registerConnectorRoutes = ({ logger, router, core }: RouteDependencies) => {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: '/internal/workchat/connectors',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.useWorkchat],
        },
      },
      validate: false,
    },
    wrapHandler(async (ctx, request, res) => {
      const [, startDeps] = await core.getStartServices();
      const { actions } = startDeps;

      const connectors = await getConnectorList({
        request,
        actions,
      });

      return res.ok<ListConnectorsResponse>({
        body: { connectors },
      });
    })
  );
};
