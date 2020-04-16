/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IContextProvider, RequestHandler } from 'kibana/server';
import { Agent } from '../common/types/models';
import * as AgentService from './services/agents';
import { IngestManagerRequestHandlerContext } from '../common/types';

export const createIngestManagerRequestHandlerContext = (): IContextProvider<
  RequestHandler<IngestManagerRequestHandlerContext, any, any>,
  'ingestManagerPlugin'
> => {
  return async context => {
    return {
      getAgent: async (agentId: string): Promise<Agent> => {
        return await AgentService.getAgent(context.core.savedObjects.client, agentId);
      },
    };
  };
};
