/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowExecutionError, type NodeTypeDefinition } from '@kbn/wc-framework-types-server';

export interface ToolActionNodeConfigType {
  toolId: string;
  toolArguments: Record<string, unknown>;
  parseResponse: boolean;
  output: string;
}

export const getToolActionNodeTypeDefinition = (): NodeTypeDefinition<ToolActionNodeConfigType> => {
  return {
    id: 'toolAction',
    name: 'Tool action',
    description: 'Execute a tool with predefined or dynamic parameters',
    factory: (context) => {
      return {
        run: async ({ input, state, executionState }) => {
          const {
            services: { toolProvider },
          } = context;
          const { toolId, toolArguments, parseResponse = false, output } = input;

          if (!(await toolProvider.has(toolId))) {
            throw new WorkflowExecutionError(`Tool with id [${toolId}] not found`, 'toolNotFound', {
              state: executionState,
            });
          }

          const tool = await toolProvider.get(toolId);
          let toolResult = await tool.handler(toolArguments);

          if (parseResponse && typeof toolResult === 'string') {
            toolResult = JSON.parse(toolResult);
          }

          state.set(output, toolResult);
        },
      };
    },
  };
};
