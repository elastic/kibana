/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreSetup, SavedObjectsClientContract } from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core/server';
import type { PluginSetupContract as AlertingPluginSetup } from '@kbn/alerting-plugin/server';
import type { CasesClient } from '../client';
import { getCasesConnectorAdapter, getCasesConnectorType } from './cases';

export * from './types';
export { casesConnectors } from './factory';

export function registerConnectorTypes({
  alerting,
  actions,
  core,
  getCasesClient,
  getSpaceId,
}: {
  actions: ActionsPluginSetupContract;
  alerting: AlertingPluginSetup;
  core: CoreSetup;
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>;
  getSpaceId: (request?: KibanaRequest) => string;
}) {
  const getUnsecuredSavedObjectsClient = async (
    request: KibanaRequest,
    savedObjectTypes: string[]
  ): Promise<SavedObjectsClientContract> => {
    const [coreStart] = await core.getStartServices();

    /**
     * The actions framework ensures that the user executing the case action
     * will have permissions to use cases for the corresponding owner and space.
     * The required Kibana privileges needed to execute the case action are defined
     * in x-pack/plugins/cases/server/connectors/cases/index.ts.
     *
     * We can safely disable security checks performed by the saved object client
     * as we implement our custom authorization.
     */
    const unsecuredSavedObjectsClient = coreStart.savedObjects.getScopedClient(request, {
      includedHiddenTypes: savedObjectTypes,
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });

    return unsecuredSavedObjectsClient;
  };

  actions.registerSubActionConnectorType(
    getCasesConnectorType({ getCasesClient, getSpaceId, getUnsecuredSavedObjectsClient })
  );

  alerting.registerConnectorAdapter(getCasesConnectorAdapter());
}
