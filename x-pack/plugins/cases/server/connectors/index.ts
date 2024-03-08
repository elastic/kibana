/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreSetup, SavedObjectsClientContract } from '@kbn/core/server';
import type { CasesClient } from '../client';
import { getCasesConnectorType } from './cases';

export * from './types';
export { casesConnectors } from './factory';

export function registerConnectorTypes({
  actions,
  core,
  getCasesClient,
  getSpaceId,
}: {
  actions: ActionsPluginSetupContract;
  core: CoreSetup;
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
  getSpaceId: (request?: KibanaRequest) => string;
}) {
  const getScopedSavedObjectClient = async (
    request: KibanaRequest,
    savedObjectTypes: string[]
  ): Promise<SavedObjectsClientContract> => {
    const [coreStart] = await core.getStartServices();
    const unsecuredSavedObjectsClient = coreStart.savedObjects.getScopedClient(request, {
      includedHiddenTypes: savedObjectTypes,
    });

    return unsecuredSavedObjectsClient;
  };

  actions.registerSubActionConnectorType(
    getCasesConnectorType({ getCasesClient, getSpaceId, getScopedSavedObjectClient })
  );
}
