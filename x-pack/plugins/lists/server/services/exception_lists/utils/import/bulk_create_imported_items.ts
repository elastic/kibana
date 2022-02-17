/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';
import { SavedObjectsBulkCreateObject, SavedObjectsClientContract } from 'kibana/server';

import { ExceptionListSoSchema } from '../../../../schemas/saved_objects/exceptions_list_so_schema';
import { ImportResponse } from '../../import_exception_list_and_items';

/**
 * Helper to bulk create exception list items
 * container
 * @param itemsToCreate {array} - exception items to be bulk created
 * @param savedObjectsClient {object}
 * @returns {array} returns array of success and error formatted responses
 */
export const bulkCreateImportedItems = async ({
  itemsToCreate,
  savedObjectsClient,
}: {
  itemsToCreate: Array<SavedObjectsBulkCreateObject<ExceptionListSoSchema>>;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<ImportResponse[]> => {
  if (!itemsToCreate.length) {
    return [];
  }
  const bulkCreateResponse = await savedObjectsClient.bulkCreate(itemsToCreate, {
    overwrite: false,
  });

  return bulkCreateResponse.saved_objects.map((so) => {
    if (has('error', so) && so.error != null) {
      return {
        error: {
          message: so.error.message,
          status_code: so.error.statusCode ?? 400,
        },
        item_id: '(unknown item_id)',
      };
    } else {
      return {
        id: so.id,
        status_code: 200,
      };
    }
  });
};
