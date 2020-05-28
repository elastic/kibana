/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, SavedObjectsClient } from 'kibana/server';
import { FoundExceptionListItemSchema } from '../../../../../../lists/common/schemas/response/found_exception_list_item_schema';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { findExceptionListItem } from '../../../../../../lists/server/services/exception_lists/find_exception_list_item';

const allowlistBaseRoute: string = '/api/endpoint/allowlist';

export interface EndpointExceptionList {
  exceptions_list: ExceptionsList[];
}

export interface ExceptionsList {
  type: string;
  entries: EntryElement[];
}

export interface EntryElement {
  field: string;
  operator: string;
  entry: EntryEntry;
}

export interface EntryEntry {
  exact_caseless?: string;
  exact_caseless_any?: string[];
}

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

async function getFullEndpointExceptionList(
  soClient: SavedObjectsClient
): Promise<EndpointExceptionList> {
  const exceptions: EndpointExceptionList = { exceptions_list: [] };
  let numResponses = 0;
  let page = 1;

  do {
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
      numResponses = response.data.length;

      exceptions.exceptions_list = exceptions.exceptions_list.concat(
        translateToEndpointExceptions(response)
      );

      page++;
    } else {
      break;
    }
  } while (numResponses > 0);

  return exceptions;
}

/**
 * Translates Exception list items to Exceptions the endpoint can understand
 * @param exc
 */
function translateToEndpointExceptions(exc: FoundExceptionListItemSchema): ExceptionsList[] {
  const translated: ExceptionsList[] = [];
  // Transform to endpoint format
  exc.data.forEach((item) => {
    const endpointItem: ExceptionsList = {
      type: item.type,
      entries: [],
    };
    item.entries.forEach((entry) => {
      // TODO case sensitive?
      const e: EntryEntry = {};
      if (entry.match) {
        e.exact_caseless = entry.match;
      }

      if (entry.match_any) {
        e.exact_caseless_any = entry.match_any;
      }

      endpointItem.entries.push({
        field: entry.field,
        operator: entry.operator,
        entry: e,
      });
    });
    translated.push(endpointItem);
  });
  return translated;
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
