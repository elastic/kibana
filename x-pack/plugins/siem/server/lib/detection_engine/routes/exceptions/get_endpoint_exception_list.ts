/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, SavedObjectsClient } from 'kibana/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExceptionListClient } from '../../../../../../lists/server/services/exception_lists/exception_list_client';
import { GetFullEndpointExceptionList } from '../../../exceptions/fetch_endpoint_exceptions';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

/**
 * Registers the exception list route to enable sensors to download a compressed exception list
 */
export function getEndpointExceptionList(router: IRouter) {
  router.get(
    {
      path: `${allowlistBaseRoute}`,
      validate: {},
      options: { authRequired: true },
    },
    handleEndpointExceptionDownload
  );
}

/**
 * Handles the GET request for downloading the whitelist
 */
async function handleEndpointExceptionDownload(context, req, res) {
  try {
    const soClient: SavedObjectsClient = context.core.savedObjects.client;
    const eClient: ExceptionListClient = new ExceptionListClient({
      savedObjectsClient: soClient,
      user: 'kibana',
    });
    const exceptions = await GetFullEndpointExceptionList(eClient);
    return res.ok({ body: exceptions });
  } catch (err) {
    return res.internalError({ body: err });
  }
}
