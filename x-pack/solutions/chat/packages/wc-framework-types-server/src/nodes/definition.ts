/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '@kbn/wc-framework-types-common';
import type { NodeTypeToNodeConfigMap } from './node_type_configs';

/**
 * A definition for a builtIn node, bound to the corresponding configuration schema.
 */
export interface BuiltInNodeDefinition<T extends NodeType> {
  /**
   * Unique ID for this node, within the workflow definition
   */
  id: string;
  /**
   * The type of node.
   */
  type: T;
  /**
   * Optional description of what the node does in the workflow
   */
  description?: string;
  /**
   * Specific configuration for this node's type.
   */
  configuration: NodeTypeToNodeConfigMap[T];
}

type AllBuiltInNodeDefinitions = {
  [K in NodeType]: BuiltInNodeDefinition<K>;
}[NodeType];

/**
 * Describes the configuration structure of a node within a {@link WorkflowDefinition}.
 *
 * This is the **persistence** shape: what will be stored in the workflow definition.
 */
export interface CustomNodeDefinition<NodeTypeConfigType = Record<string, unknown>> {
  /**
   * Unique ID for this node, within the workflow definition
   */
  id: string;
  /**
   * The type of node.
   */
  type: string;
  /**
   * Optional description of what the node does in the workflow
   */
  description?: string;
  /**
   * Specific configuration for this node's type.
   */
  configuration: NodeTypeConfigType;
}

/**
 * Describes the configuration structure of a node within a {@link WorkflowDefinition}.
 *
 */
export type NodeDefinition = AllBuiltInNodeDefinitions;
