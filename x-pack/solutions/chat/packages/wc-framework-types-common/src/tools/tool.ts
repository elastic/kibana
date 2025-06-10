/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents the definition of a tool, without its handler or schema.
 */
export interface ToolDescriptor {
  /**
   * A unique id for this tool.
   */
  id: string;
  /**
   * Name of the tool, which will be exposed to the LLM.
   */
  name: string;
  /**
   * The description for this tool, which will be exposed to the LLM.
   */
  description: string;
  /**
   * An arbitrary record of meta, that can be used for filtering / identifying tools in workflows.
   */
  meta?: Record<string, string>;
}
