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
  type WorkflowExecutionNodeConfigType,
} from '@kbn/wc-framework-types-server';
import { interpolateValue } from '../../state';

export const getWorkflowExecutionNodeTypeDefinition =
  (): NodeTypeDefinition<WorkflowExecutionNodeConfigType> => {
    return {
      id: NodeType.workflowExecution,
      name: 'Workflow execution',
      description: 'Execute a workflow with predefined or dynamic parameters',
      factory: (context) => {
        return {
          run: async ({ input, state, executionState }) => {
            const {
              services: { workflowRegistry, workflowRunner },
            } = context;

            const interpolatedInput = interpolateValue<WorkflowExecutionNodeConfigType>(
              input,
              state
            );
            const { workflowId, inputs, output } = interpolatedInput;

            if (!workflowRegistry.has(workflowId)) {
              throw new WorkflowExecutionError(
                `Workflow with id [${workflowId}] not found`,
                'workflowNotFound',
                { state: executionState }
              );
            }

            const workflowDefinition = workflowRegistry.get(workflowId);

            const workflowResult = await workflowRunner.runWorkflow({
              workflowDefinition,
              inputs,
            });

            const workflowOutput = workflowResult.output;

            state.set(output, workflowOutput);
          },
        };
      },
    };
  };
