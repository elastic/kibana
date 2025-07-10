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
  [NodeType.loop]: LoopNodeConfigType;
  [NodeType.intentRecognition]: IntentRecognitionNodeConfigType;
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

/**
 * Represents the configuration for a `loop` node.
 */
export interface LoopNodeConfigType {
  /**
   * Reference of the context variable to loop over.
   * Supports interpolation. If interpolated value is a list,
   * will use it directly. If interpolated value is a string,
   * will retrieve the corresponding entry in the current state.
   */
  inputList: string;
  /**
   * Name of the state property to inject the current loop element into.
   * Supports interpolation, but final value must be a string.
   */
  itemVar: string;
  /**
   * The sequence of steps to execute for each element in the list.
   */
  steps: NodeSequence;
  /**
   * If defined, will accumulate results from each loop iteration,
   * by reading the `output.source` context property in the loop's state,
   * and creating a `output.destination` array in the parent's state.
   */
  output?: {
    source: string;
    destination: string;
  };
}

/**
 * Config for `intentRecognition` node type.
 */
export interface IntentRecognitionNodeConfigType {
  /**
   * The prompt explaining the LLM the criteria for its choices
   */
  prompt: string;
  /**
   *
   */
  branches: IntentRecognitionBranch[];
}

export type IntentRecognitionBranch =
  | IntentRecognitionConditionBranch
  | IntentRecognitionDefaultBranch;

export interface IntentRecognitionConditionBranch {
  id?: string;
  /**
   * The condition for this branch.
   *
   * Will be interpolated with the intent recognition node's state.
   */
  condition: string;
  steps: NodeSequence;
}

export interface IntentRecognitionDefaultBranch {
  default: true;
  steps: NodeSequence;
}
