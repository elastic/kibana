/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, RequestHandlerContext } from '@kbn/core/server';
import {
  InferenceConnector,
  InferenceConnectorType,
  isSupportedConnectorType,
} from '../../common/connectors';
import type { InferenceServerStart, InferenceStartDependencies } from '../types';

export function registerConnectorsRoute({
  coreSetup,
  router,
}: {
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  router: IRouter<RequestHandlerContext>;
}) {
  router.get(
    {
      path: '/internal/inference/connectors',
      validate: {},
    },
    async (_context, request, response) => {
      const actions = await coreSetup
        .getStartServices()
        .then(([_coreStart, pluginsStart]) => pluginsStart.actions);

      const client = await actions.getActionsClientWithRequest(request);

      const allConnectors = await client.getAll({
        includeSystemActions: false,
      });

      const connectors: InferenceConnector[] = allConnectors
        .filter((connector) => isSupportedConnectorType(connector.actionTypeId))
        .map((connector) => {
          return {
            connectorId: connector.id,
            name: connector.name,
            type: connector.actionTypeId as InferenceConnectorType,
          };
        });

      return response.ok({ body: { connectors } });
    }
  );
}
