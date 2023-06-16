/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '@kbn/core/server';
import { ILicenseState } from '../lib';
import { verifyAccessAndContext } from './lib';
import { AlertingRequestHandlerContext, INTERNAL_BASE_ALERTING_API_PATH } from '../types';
import { ConnectorAdapterRegistry } from '../connector_adapter_registry';

export const getAllConnectorAdaptersRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState,
  connectorAdapterRegistry: ConnectorAdapterRegistry,
) => {
  router.get(
    {
      path: `${INTERNAL_BASE_ALERTING_API_PATH}/_connector_adapters`,
      validate: false,
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        return res.ok({ body: connectorAdapterRegistry.list() });
      })
    )
  );
};
