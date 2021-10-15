/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExceptionListSchema,
  FoundExceptionListItemSchema,
  IdOrUndefined,
  ListIdOrUndefined,
  NamespaceType,
} from '@kbn/securitysolution-io-ts-list-types';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';

import {
  FindExceptionListItemOptions,
  GetExceptionListOptions,
} from './exception_list_client_types';

interface ExportExceptionListAndItemsOptions {
  id: IdOrUndefined;
  listId: ListIdOrUndefined;
  getExceptionList: (args: GetExceptionListOptions) => Promise<ExceptionListSchema | null>;
  findExceptionListItem: (
    args: FindExceptionListItemOptions
  ) => Promise<FoundExceptionListItemSchema | null>;
  namespaceType: NamespaceType;
}

export const exportExceptionListAndItems = async ({
  id,
  listId,
  namespaceType,
  getExceptionList,
  findExceptionListItem,
}: ExportExceptionListAndItemsOptions): Promise<string | null> => {
  const exceptionList = await getExceptionList({
    id,
    listId,
    namespaceType,
  });

  if (exceptionList == null) {
    return null;
  } else {
    const listItems = await findExceptionListItem({
      filter: undefined,
      listId: exceptionList.list_id,
      namespaceType: exceptionList.namespace_type,
      page: 1,
      perPage: 10000,
      sortField: 'exception-list.created_at',
      sortOrder: 'desc',
    });
    const exceptionItems = listItems?.data ?? [];

    const { exportData } = getExport([exceptionList, ...exceptionItems]);
    const { exportDetails } = getExportDetails(exceptionList.id, exceptionItems);

    return `${exportData}${exportDetails}`;
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

export const getExportDetails = (
  id: string,
  items: unknown[]
): {
  exportDetails: string;
} => {
  const exportDetails = JSON.stringify({
    exported_exception_list_id: id,
    exported_exception_list_items_count: items.length,
  });
  return { exportDetails: `${exportDetails}\n` };
};
