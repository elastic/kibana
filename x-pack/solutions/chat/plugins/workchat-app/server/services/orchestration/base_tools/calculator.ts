/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from 'expr-eval';
import { z } from '@kbn/zod';
import { type McpTool, toolResult } from '@kbn/wci-server';

export const getCalculatorTool = (): McpTool => {
  return {
    name: 'calculator',
    description: `
    Useful for getting the result of a math expression.
    The input should be a valid mathematical expression that could be executed by a simple calculator.

    Examples:
    - 125 * (5 + 19)
    - 4 - 12^3
    `,
    schema: {
      input: z.string().describe('the expression to evaluate'),
    },
    execute: async ({ input }) => {
      try {
        return toolResult.text(Parser.evaluate(input).toString());
      } catch (e) {
        return toolResult.error(`Error evaluating expression: ${e.message}`);
      }
    },
  };
};
