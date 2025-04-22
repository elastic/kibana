/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tool } from '@kbn/wc-framework-types-server';
import type { ToolRegistry } from '../../tools';
import { getCalculatorTool } from './calculator';

export const registerBuiltInTools = ({ registry }: { registry: ToolRegistry }) => {
  const tools: Tool[] = [getCalculatorTool()];

  tools.forEach((tool) => {
    registry.register(tool);
  });
};
