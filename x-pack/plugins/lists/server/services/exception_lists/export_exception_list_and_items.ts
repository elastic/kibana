/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExportExceptionDetails,
  IdOrUndefined,
  ListIdOrUndefined,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';
import { SavedObjectsClientContract } from 'kibana/server';

import { findExceptionListItem } from './find_exception_list_item';
import { getExceptionList } from './get_exception_list';

interface ExportExceptionListAndItemsOptions {
  id: IdOrUndefined;
  listId: ListIdOrUndefined;
  savedObjectsClient: SavedObjectsClientContract;
  namespaceType: NamespaceType;
}

export interface ExportExceptionListAndItemsReturn {
  exportData: string;
  exportDetails: ExportExceptionDetails;
}

export const exportExceptionListAndItems = async ({
  id,
  listId,
  namespaceType,
  savedObjectsClient,
}: ExportExceptionListAndItemsOptions): Promise<ExportExceptionListAndItemsReturn | null> => {
  const exceptionList = await getExceptionList({
    id,
    listId,
    namespaceType,
    savedObjectsClient,
  });

  if (exceptionList == null) {
    return null;
  } else {
    // TODO: Will need to address this when we switch over to
    // using PIT, don't want it to get lost
    // https://github.com/elastic/kibana/issues/103944
    const listItems = await findExceptionListItem({
      filter: undefined,
      listId: exceptionList.list_id,
      namespaceType: exceptionList.namespace_type,
      page: 1,
      perPage: 10000,
      savedObjectsClient,
      sortField: 'exception-list.created_at',
      sortOrder: 'desc',
    });
    const exceptionItems = listItems?.data ?? [];
    const { exportData } = getExport([exceptionList, ...exceptionItems]);

    // TODO: Add logic for missing lists and items on errors
    return {
      exportData: `${exportData}`,
      exportDetails: {
        exported_exception_list_count: 1,
        exported_exception_list_item_count: exceptionItems.length,
        missing_exception_list_item_count: 0,
        missing_exception_list_items: [],
        missing_exception_lists: [],
        missing_exception_lists_count: 0,
      },
    };
  }
};

export const getExport = (
  data: unknown[]
): {
  exportData: string;
} => {
  const ndjson = transformDataToNdjson(data);

  return { exportData: ndjson };
};
