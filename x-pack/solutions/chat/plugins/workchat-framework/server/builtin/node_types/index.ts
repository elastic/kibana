/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type NodeTypeDefinition } from '@kbn/wc-framework-types-server';
import type { NodeTypeRegistry } from '../../framework/nodes';
import { getToolExecutionNodeTypeDefinition } from './tool_execution';
import { getWorkflowExecutionNodeTypeDefinition } from './workflow_execution';
import { getParallelSequencesNodeTypeDefinition } from './parallel_sequences';
import { getPromptNodeTypeDefinition } from './prompt';

export const registerBuiltInNodeTypes = ({ registry }: { registry: NodeTypeRegistry }) => {
  const definitions: Array<NodeTypeDefinition<any>> = [
    getToolExecutionNodeTypeDefinition(),
    getWorkflowExecutionNodeTypeDefinition(),
    getParallelSequencesNodeTypeDefinition(),
    getPromptNodeTypeDefinition(),
  ];

  definitions.forEach((definition) => {
    registry.register(definition);
  });
};

export type { ToolExecutionNodeConfigType } from './tool_execution';
export type { WorkflowExecutionNodeConfigType } from './workflow_execution';
export type { ParallelSequencesNodeConfigType } from './parallel_sequences';
export type { PromptNodeConfigType } from './prompt';
