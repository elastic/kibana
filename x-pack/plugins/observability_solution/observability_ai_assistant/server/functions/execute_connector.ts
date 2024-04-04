/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionRegistrationParameters } from '.';

export function registerExecuteConnectorFunction({
  functions,
  resources,
}: FunctionRegistrationParameters) {
  functions.registerFunction(
    {
      name: 'execute_connector',
      contexts: ['core'],
      description: 'Use this function when user explicitly asks to call a kibana connector.',
      descriptionForUser: 'Call kibana connector on behalf of the user',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: {
            type: 'string',
            description: 'The id of the connector',
          },
          params: {
            type: 'object',
            description: 'The connector parameters',
          },
        },
        required: ['id', 'params'],
      } as const,
    },
    async ({ arguments: { id, params } }, signal) => {
      const actionsClient = await (
        await resources.plugins.actions.start()
      ).getActionsClientWithRequest(resources.request);
      await actionsClient.execute({ actionId: id, params });
      return { content: {} };
    }
  );
}
