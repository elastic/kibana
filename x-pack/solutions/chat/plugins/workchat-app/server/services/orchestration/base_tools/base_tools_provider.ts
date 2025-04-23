/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getConnectToInternalServer,
  createMcpServer,
  type McpClientProvider,
} from '@kbn/wci-server';
import { baseToolsProviderId } from '../../../../common/constants';
import { getCalculatorTool } from './calculator';

export const getBaseToolProvider = async (): Promise<McpClientProvider> => {
  const tools = [getCalculatorTool()];

  const server = createMcpServer({
    name: baseToolsProviderId,
    version: '1.0.0',
    tools,
  });

  return {
    id: baseToolsProviderId,
    connect: getConnectToInternalServer({
      server,
      clientName: 'baseToolsClient',
    }),
    meta: {
      builtin: true,
    },
  };
};
