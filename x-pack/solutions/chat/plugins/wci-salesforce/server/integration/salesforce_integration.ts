/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { IntegrationType } from '@kbn/wci-common';
import {
  getConnectToInternalServer,
  type WorkchatIntegrationDefinition,
  type WorkChatIntegration,
} from '@kbn/wci-server';
import type { WCISalesforceConfiguration } from '../types';
import { createMcpServer } from './mcp_server';

export const getSalesforceIntegrationDefinition = ({
  core,
  logger,
}: {
  core: CoreSetup;
  logger: Logger;
}): WorkchatIntegrationDefinition<WCISalesforceConfiguration> => {
  return {
    getType: () => IntegrationType.salesforce,
    createIntegration: async ({
      request,
      integrationId,
      configuration,
    }): Promise<WorkChatIntegration> => {
      const [coreStart] = await core.getStartServices();
      const elasticsearchClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

      const mcpServer = await createMcpServer({
        integrationId,
        configuration,
        elasticsearchClient,
        logger,
      });

      return {
        connect: getConnectToInternalServer({ server: mcpServer }),
      };
    },
  };
};
