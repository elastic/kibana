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
        .map((exceptionListAndItem) => {
          const savedObjectType = getSavedObjectTypes({ namespaceType: ['single'] });
          const client = getScopedClient(context.request);
          // TODO: Replace this function below with the "client.createPointInTimeFinder" PIT one seems like a better version.
          const foundItems = client.find<ExceptionListSoSchema>({
            filter: getExceptionListsItemFilter({
              filter: [],
              listId: [exceptionListAndItem.attributes.list_id],
              savedObjectType,
            }),
            page: 1,
            perPage: 10000, // NOTE: Exception list items do not support > 10k and during testing we do not exceed this number. The limitation is creating queries around 10k cause payload issues.
            sortField: undefined,
            sortOrder: undefined,
            type: savedObjectType,
          });
          return foundItems;
        })
    )
  )
    // eslint-disable-next-line @typescript-eslint/naming-convention
    .flatMap(({ saved_objects }) => saved_objects);

  // remove any duplicates we found from the list items against the passed in exceptionLists
  const removedDuplicates = exceptionListsAndItems.filter(
    (exceptionList) => !foundListItems.some((item) => item.id === exceptionList.id)
  );

  return [...foundListItems, ...removedDuplicates];
};
