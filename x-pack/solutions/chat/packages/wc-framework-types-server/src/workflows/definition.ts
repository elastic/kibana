/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MaybePromise } from '@kbn/utility-types';
import type { NodeDefinition } from '../nodes';

/**
 * Describes the definition of a workflow.
 *
 * This is only meant to be the "pure" definition. Persistence related things (e.g. id),
 * or ownerId will be on higher-level structures.
 */
export interface BaseWorkflowDefinition {
  /**
   * A unique ID that can be used to reference this workflow.
   */
  id: string;
  /**
   * The name of the workflow.
   *
   * Should be human (and LLM) readable, e.g. "Salesforce Case Summarization".
   * Will be exposed to the LLM in some situations.
   */
  name: string;
  /**
   * A short description of what this workflow does.
   * Will be exposed to the LLM in some situations (e.g. assistant orchestrator or intent detection step)
   */
  description: string;
  /**
   * List of inputs for this workflow.
   */
  inputs: WorkflowDefinitionInput[];
  /**
   * List of outputs for this workflow.
   */
  outputs: WorkflowDefinitionOutput[];
}

export interface GraphWorkflowDefinition extends BaseWorkflowDefinition {
  /**
   * Unique type identifier for graph workflows
   */
  type: 'graph';
  /**
   * Configuration for each of the workflow's nodes.
   */
  steps: NodeDefinition[];
}

/**
 * Function workflows allow arbitrary function execution as workflows.
 *
 * Can be used to "import" a workflow in the framework.
 */
export interface FunctionWorkflowDefinition extends BaseWorkflowDefinition {
  /**
   * Unique type identifier for function workflows
   */
  type: 'function';
  /**
   * The function handler that should be called to execute the workflow.
   */
  handler: (input: Record<string, unknown>) => MaybePromise<Record<string, unknown>>;
}

export type WorkflowDefinition = GraphWorkflowDefinition | FunctionWorkflowDefinition;

export interface WorkflowDefinitionInput {
  name: string;
  description: string;
  type: WorkflowInputType;
  required?: boolean;
}

export type WorkflowInputType = 'string' | 'number';

export interface WorkflowDefinitionOutput {
  name: string;
  description: string;
  ref: string;
}
