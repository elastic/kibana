/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, SavedObject, SavedObjectsExportTransformContext } from 'kibana/server';
import { getSavedObjectTypes } from '@kbn/securitysolution-list-utils';

import { ExceptionListSoSchema } from '../schemas/saved_objects/exceptions_list_so_schema';
import { getExceptionListsItemFilter } from '../services/exception_lists/find_exception_list_items';

export const onExport = async ({
  context,
  exceptionLists,
  startServices,
}: {
  context: SavedObjectsExportTransformContext;
  exceptionLists: Array<SavedObject<ExceptionListSoSchema>>;
  startServices: Promise<[CoreStart, object, unknown]>;
}): Promise<Array<SavedObject<ExceptionListSoSchema>>> => {
  const [
    {
      savedObjects: { getScopedClient },
    },
  ] = await startServices;
  const foundListItems = await Promise.all(
    exceptionLists.map((exceptionList) => {
      const savedObjectType = getSavedObjectTypes({ namespaceType: ['single'] });
      const client = getScopedClient(context.request);
      const foundItems = client.find<ExceptionListSoSchema>({
        filter: getExceptionListsItemFilter({
          filter: [],
          listId: [exceptionList.attributes.list_id],
          savedObjectType,
        }),
        page: 1,
        perPage: 10000, // NOTE: We are limited to 10k list items unless we do chunking/paging for each page.
        sortField: undefined,
        sortOrder: undefined,
        type: savedObjectType,
      });
      return foundItems;
    })
  );
  const exceptionListItems = foundListItems.flatMap((foundListItem) => {
    return foundListItem.saved_objects;
  });
  return [...exceptionListItems, ...exceptionLists];
};
