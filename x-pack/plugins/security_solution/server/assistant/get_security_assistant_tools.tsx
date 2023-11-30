/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tool } from 'langchain/tools';
import { DynamicTool } from 'langchain/tools';

/**
 * This function returns a list of tools that will be available in the Elastic AI Assistant for Security Solution users.
 */
export const getSecurityAssistantTools = (): Tool => {
  return new DynamicTool({
    name: 'ListFavoriteFoods',
    verbose: true,
    description:
      'Call this function to get a list of my favorite foods. Input is an empty string, output is a string containing a comma separated list of favorite foods.',
    func: async (input: string): Promise<string> => {
      return 'pizza, pizza, pizza!';
    },
  });
};
