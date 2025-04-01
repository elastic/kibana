/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import { IntegrationType } from '@kbn/wci-common';
import {
  getConnectToExternalServer,
  WorkchatIntegrationDefinition,
  WorkChatIntegration,
} from '@kbn/wci-server';
import { WCIExternalServerConfiguration } from '../../common/types';

export const getExternalServerIntegrationDefinition = ({
  core,
  logger,
}: {
  core: CoreSetup;
  logger: Logger;
}): WorkchatIntegrationDefinition<WCIExternalServerConfiguration> => {
  return {
    getType: () => IntegrationType.external_server,
    createIntegration: async ({ configuration }): Promise<WorkChatIntegration> => {
      return {
        connect: getConnectToExternalServer({
          serverUrl: configuration.url,
        }),
      };
    },
  };
};
