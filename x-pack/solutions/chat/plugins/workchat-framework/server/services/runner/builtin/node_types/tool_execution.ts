/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import {
  WorkflowExecutionError,
  type NodeTypeDefinition,
  type ToolExecutionNodeConfigType,
} from '@kbn/wc-framework-types-server';
import { interpolateValue } from '../../state';

export const getToolExecutionNodeTypeDefinition =
  (): NodeTypeDefinition<ToolExecutionNodeConfigType> => {
    return {
      id: NodeType.toolExecution,
      name: 'Tool execution',
      description: 'Execute a tool with predefined or dynamic parameters',
      factory: (context) => {
        return {
          run: async ({ input, state, executionState }) => {
            const {
              services: { toolProvider },
            } = context;

            const interpolatedInput = interpolateValue<ToolExecutionNodeConfigType>(input, state);
            const { toolId, toolArguments, parseResponse, output } = interpolatedInput;

            if (!(await toolProvider.has(toolId))) {
              throw new WorkflowExecutionError(
                `Tool with id [${toolId}] not found`,
                'toolNotFound',
                {
                  state: executionState,
                }
              );
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
