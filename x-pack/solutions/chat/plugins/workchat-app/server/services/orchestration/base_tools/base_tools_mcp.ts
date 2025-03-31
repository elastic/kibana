/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getClientForInternalServer,
  createMcpServer,
  type IntegrationClient,
} from '@kbn/wci-server';
import { getCalculatorTool } from './calculator';

export const getBaseToolClient = async (): Promise<IntegrationClient> => {
  const tools = [getCalculatorTool()];

  const server = createMcpServer({
    name: 'base_tools',
    version: '1.0.0',
    tools,
  });

  return await getClientForInternalServer({ server, clientName: 'baseToolsClient' });
};
