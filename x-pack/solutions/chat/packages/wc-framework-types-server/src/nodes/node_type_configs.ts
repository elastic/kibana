/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import type { NodeDefinition } from './definition';

export interface NodeTypeToNodeConfigMap {
  [NodeType.workflowExecution]: WorkflowExecutionNodeConfigType;
  [NodeType.toolExecution]: ToolExecutionNodeConfigType;
  [NodeType.prompt]: PromptNodeConfigType;
  [NodeType.parallelSequences]: ParallelSequencesNodeConfigType;
}

export type NodeSequence = NodeDefinition[];

export interface SequenceBranch {
  steps: NodeSequence;
}

/**
 * Config for `parallelSequences` node type.
 */
export interface ParallelSequencesNodeConfigType {
  branches: SequenceBranch[];
}

/**
 * Config for `prompt` node type.
 */
export interface PromptNodeConfigType {
  prompt: string;
  output: string;
  // TODO: structuredOutput
}

/**
 * Config for `toolExecution` node type.
 */
export interface ToolExecutionNodeConfigType {
  toolId: string;
  toolArguments: Record<string, unknown>;
  parseResponse: boolean;
  output: string;
}

/**
 * Config for `workflowExecution` node type.
 */
export interface WorkflowExecutionNodeConfigType {
  workflowId: string;
  inputs: Record<string, unknown>;
  output: string;
}
