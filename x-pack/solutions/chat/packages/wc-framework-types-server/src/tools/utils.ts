/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolProvider } from './provider';
import type { Tool } from './tool';

/**
 * Utility function to create a {@link ToolProvider} from a list of tools.
 */
export const createToolProvider = (tools: Tool[]): ToolProvider => {
  const toolMap = new Map<string, Tool>();
  tools.forEach((tool) => {
    toolMap.set(tool.id, tool);
  });

  return {
    has: (id) => toolMap.has(id),
    get: (id) => {
      if (!toolMap.has(id)) {
        throw new Error();
      }
      return toolMap.get(id)!;
    },
    getAll: () => [...toolMap.values()],
  };
};
