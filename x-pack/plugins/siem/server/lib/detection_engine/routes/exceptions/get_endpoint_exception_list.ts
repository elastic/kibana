/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, SavedObjectsClient } from 'kibana/server';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

/**
 * Registers the exception list route to enable sensors to download a compressed  allowlist
 */
export function getEndpointExceptionList(router: IRouter) {
  router.get(
    {
      path: `${allowlistBaseRoute}`,
      validate: {}, // TODO: add param for hash
      options: { authRequired: true },
    },
    handleEndpointExceptionDownload
  );
}

/**
 * Handles the GET request for downloading the allowlist
 */
async function handleEndpointExceptionDownload(context, req, res) {
  try {
    const soClient: SavedObjectsClient = context.core.savedObjects.client;
    const sha256Hash = '1825fb19fcc6dc391cae0bc4a2e96dd7f728a0c3ae9e1469251ada67f9e1b975'; // TODO get from req
    const resp = await soClient.find({
      type: 'siem-exceptions-artifact',
      search: sha256Hash,
      searchFields: ['sha256'],
    });
    if (resp.total > 0) {
      return res.ok({ body: resp.saved_objects[0] });
    } else {
      return res.notFound({});
    }
  } catch (err) {
    return res.internalError({ body: err });
  }
}
