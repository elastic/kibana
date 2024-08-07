/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { isSupportedConnectorType } from '../../common/connectors';
import { createInferenceRequestError } from '../../common/errors';
import { createChatCompleteApi } from '../chat_complete';
import type { InferenceClient, InferenceStartDependencies } from '../types';
import { createOutputApi } from '../../common/output/create_output_api';

export function createInferenceClient({
  request,
  actions,
}: { request: KibanaRequest } & Pick<InferenceStartDependencies, 'actions'>): InferenceClient {
  const chatComplete = createChatCompleteApi({ request, actions });
  return {
    chatComplete,
    output: createOutputApi(chatComplete),
    getConnectorById: async (id: string) => {
      const actionsClient = await actions.getActionsClientWithRequest(request);
      let connector: Awaited<ReturnType<ActionsClient['get']>>;

      try {
        connector = await actionsClient.get({
          id,
          throwIfSystemAction: true,
        });
      } catch (error) {
        throw createInferenceRequestError(`No connector found for id ${id}`, 400);
      }

      const actionTypeId = connector.id;

      if (!isSupportedConnectorType(actionTypeId)) {
        throw createInferenceRequestError(
          `Type ${actionTypeId} not recognized as a supported connector type`,
          400
        );
      }

      return {
        connectorId: connector.id,
        name: connector.name,
        type: actionTypeId,
      };
    },
  };
}
