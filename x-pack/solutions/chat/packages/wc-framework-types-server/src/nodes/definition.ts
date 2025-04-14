/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Describes the configuration structure of a node within a {@link WorkflowDefinition}.
 *
 * This is the **persistence** shape: what will be stored in the workflow definition.
 */
export interface NodeDefinition<NodeTypeConfigType = unknown> {
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
   * Configure in which context field the output of the node would be written in.
   */
  output: string;
  /**
   * Specific configuration for this node's type.
   */
  typeConfig: NodeTypeConfigType;
}
