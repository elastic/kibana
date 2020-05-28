/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, RequestHandlerContext, APICaller, SavedObjectsClient } from 'kibana/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { findExceptionListItem } from '../../../../../../lists/server/services/exception_lists/find_exception_list_item';

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

async function getFullEndpointExceptionList(soClient: SavedObjectsClient) {
  let exceptions = []; // TODO: type me
  let numResponses = 0;
  let page = 1;

  do {
    console.log(`Fetching page ${page}`);
    const response = await findExceptionListItem({
      listId: 'endpoint_list', // TODO
      namespaceType: 'single', // ?
      savedObjectsClient: soClient,
      filter: undefined,
      perPage: 100,
      page,
      sortField: undefined,
      sortOrder: undefined,
    });

    if (response?.data !== undefined) {
      console.log(`Found ${response.data.length} exceptions`);
      numResponses = response.data.length;
      exceptions = exceptions.concat(response.data);
      page++;
    } else {
      break;
    }
  } while (numResponses > 0);

  return exceptions;
}

/**
 * Handles the GET request for downloading the whitelist
 */
async function handleEndpointExceptionDownload(context, req, res) {
  try {
    // const whitelistHash: string = req.params.hash;
    // const bufferHash = createHash('sha256')
    //   .update(whitelistArtifactCache.toString('utf8'), 'utf8')
    //   .digest('hex');
    // if (whitelistHash !== bufferHash) {
    //   return res.badRequest({
    //     body: i18n.translate('allowlist.download.fail', {
    //       defaultMessage:
    //         'The requested artifact with hash {whitelistHash} does not match current hash of {bufferHash}',
    //       values: { whitelistHash, bufferHash },
    //       description: 'Allowlist download failure.',
    //     }),
    //   });
    // }
    const soClient: SavedObjectsClient = context.core.savedObjects.client;
    const exceptions = await getFullEndpointExceptionList(soClient);
    return res.ok({ body: exceptions });
  } catch (err) {
    return res.internalError({ body: err });
  }
}
