/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InferenceClient, InferenceStartDependencies } from '../types';
import { createChatCompleteApi } from '../chat_complete';
import { createOutputApi } from '../../common/output/create_output_api';
import { getConnectorById } from '../util/get_connector_by_id';

export function createInferenceClient({
  request,
  actions,
  logger,
}: { request: KibanaRequest; logger: Logger } & Pick<
  InferenceStartDependencies,
  'actions'
>): InferenceClient {
  const chatComplete = createChatCompleteApi({ request, actions, logger });
  return {
    chatComplete,
    output: createOutputApi(chatComplete),
    getConnectorById: async (connectorId: string) => {
      const actionsClient = await actions.getActionsClientWithRequest(request);
      return await getConnectorById({ connectorId, actionsClient });
    },
  };
}
