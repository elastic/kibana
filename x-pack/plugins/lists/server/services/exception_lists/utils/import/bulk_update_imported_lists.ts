/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash/fp';
import { SavedObjectsBulkUpdateObject, SavedObjectsClientContract } from '@kbn/core/server';

import { ExceptionListSoSchema } from '../../../../schemas/saved_objects/exceptions_list_so_schema';
import { ImportResponse } from '../../import_exception_list_and_items';

export const bulkUpdateImportedLists = async ({
  listsToUpdate,
  savedObjectsClient,
}: {
  listsToUpdate: Array<SavedObjectsBulkUpdateObject<ExceptionListSoSchema>>;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<ImportResponse[]> => {
  if (!listsToUpdate.length) {
    return [];
  }

  const bulkUpdateResponses = await savedObjectsClient.bulkUpdate(listsToUpdate);

  return bulkUpdateResponses.saved_objects.map((so) => {
    if (has('error', so) && so.error != null) {
      return {
        error: {
          message: so.error.message,
          status_code: so.error.statusCode ?? 400,
        },
        list_id: '(unknown list_id)',
      };
    } else {
      return {
        id: so.id,
        status_code: 200,
      };
    }
  });
};
