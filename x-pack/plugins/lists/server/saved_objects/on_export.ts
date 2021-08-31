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
  exceptionListsAndItems,
  startServices,
}: {
  context: SavedObjectsExportTransformContext;
  exceptionListsAndItems: Array<SavedObject<ExceptionListSoSchema>>;
  startServices: Promise<[CoreStart, object, unknown]>;
}): Promise<Array<SavedObject<ExceptionListSoSchema>>> => {
  const [
    {
      savedObjects: { getScopedClient },
    },
  ] = await startServices;
  const foundListItems = (
    await Promise.all(
      exceptionListsAndItems
        .filter((exceptionListAndItem) => exceptionListAndItem.attributes.list_type === 'list')
        .map(async (exceptionListAndItem) => {
          const savedObjectType = getSavedObjectTypes({ namespaceType: ['single'] });
          const savedObjectsClient = getScopedClient(context.request);
          const finder = savedObjectsClient.createPointInTimeFinder<ExceptionListSoSchema>({
            filter: getExceptionListsItemFilter({
              filter: [],
              listId: [exceptionListAndItem.attributes.list_id],
              savedObjectType,
            }),
            perPage: 100,
            type: savedObjectType,
          });
          let foundItems: Array<SavedObject<ExceptionListSoSchema>> = [];
          for await (const response of finder.find()) {
            foundItems = [...response.saved_objects, ...foundItems];
          }
          await finder.close();
          return foundItems;
        })
    )
  ).flatMap((exceptionItem) => exceptionItem);

  // remove any duplicates we found from the list items against the passed in exceptionLists
  const removedDuplicates = exceptionListsAndItems.filter(
    (exceptionList) => !foundListItems.some((item) => item.id === exceptionList.id)
  );

  return [...foundListItems, ...removedDuplicates];
};
