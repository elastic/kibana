/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolProvider, Tool } from '@kbn/wc-framework-types-server';

/**
 * Creates a tool provider than is a combination of the given providers.
 *
 * Note: order matters - providers will be checked in the order they are provided (e.g. in case of id conflicts).
 */
export const combineToolProviders = (...providers: ToolProvider[]): ToolProvider => {
  return {
    has: async (id) => {
      for (const provider of providers) {
        if (await provider.has(id)) {
          return true;
        }
      }
      return false;
    },
    get: async (id) => {
      for (const provider of providers) {
        if (await provider.has(id)) {
          return provider.get(id);
        }
      }
      throw new Error(`Tool with id ${id} not found`);
    },
    getAll: async () => {
      const tools: Tool[] = [];
      const toolIds = new Set<string>();
      for (const provider of providers) {
        const providerTools = await provider.getAll();
        for (const tool of providerTools) {
          if (!toolIds.has(tool.id)) {
            tools.push(tool);
            toolIds.add(tool.id);
          }
        }
      }
      return tools;
    },
  };
};
