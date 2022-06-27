/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import { ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';

import { ExceptionListClient, ExportExceptionListAndItemsReturn } from '@kbn/lists-plugin/server';

const NON_EXPORTABLE_LIST_IDS = [ENDPOINT_LIST_ID];
export const EXCEPTIONS_EXPORT_CHUNK_SIZE = 50;

export const getRuleExceptionsForExport = async (
  exceptions: ListArray,
  exceptionsListClient: ExceptionListClient | undefined
): Promise<ExportExceptionListAndItemsReturn> => {
  const uniqueExceptionLists = new Set();

  if (exceptionsListClient != null) {
    const exceptionsWithoutUnexportableLists = exceptions.filter((list) => {
      if (!uniqueExceptionLists.has(list.id)) {
        uniqueExceptionLists.add(list.id);
        return !NON_EXPORTABLE_LIST_IDS.includes(list.list_id);
      } else {
        return false;
      }
    });
    return getExportableExceptions(exceptionsWithoutUnexportableLists, exceptionsListClient);
  } else {
    return { exportData: '', exportDetails: getDefaultExportDetails() };
  }
};

export const getExportableExceptions = async (
  exceptions: ListArray,
  exceptionsListClient: ExceptionListClient
): Promise<ExportExceptionListAndItemsReturn> => {
  let exportString = '';
  const exportDetails = getDefaultExportDetails();

  const exceptionChunks = chunk(EXCEPTIONS_EXPORT_CHUNK_SIZE, exceptions);
  for await (const exceptionChunk of exceptionChunks) {
    const promises = createPromises(exceptionsListClient, exceptionChunk);

    const responses = await Promise.all(promises);

    for (const res of responses) {
      if (res != null) {
        const {
          exportDetails: {
            exported_exception_list_count: exportedExceptionListCount,
            exported_exception_list_item_count: exportedExceptionListItemCount,
          },
          exportData,
        } = res;

        exportDetails.exported_exception_list_count =
          exportDetails.exported_exception_list_count + exportedExceptionListCount;

        exportDetails.exported_exception_list_item_count =
          exportDetails.exported_exception_list_item_count + exportedExceptionListItemCount;

        exportString = `${exportString}${exportData}`;
      }
    }
  }

  return {
    exportDetails,
    exportData: exportString,
  };
};

/**
 * Creates promises of the exceptions to be exported and returns them.
 * @param exceptionsListClient Exception Lists client
 * @param exceptions The exceptions to be exported
 * @returns Promise of export ready exceptions.
 */
export const createPromises = (
  exceptionsListClient: ExceptionListClient,
  exceptions: ListArray
): Array<Promise<ExportExceptionListAndItemsReturn | null>> => {
  return exceptions.map<Promise<ExportExceptionListAndItemsReturn | null>>(
    async ({ id, list_id: listId, namespace_type: namespaceType }) => {
      return exceptionsListClient.exportExceptionListAndItems({
        id,
        listId,
        namespaceType,
      });
    }
  );
};

export const getDefaultExportDetails = () => ({
  exported_exception_list_count: 0,
  exported_exception_list_item_count: 0,
  missing_exception_list_item_count: 0,
  missing_exception_list_items: [],
  missing_exception_lists: [],
  missing_exception_lists_count: 0,
});
