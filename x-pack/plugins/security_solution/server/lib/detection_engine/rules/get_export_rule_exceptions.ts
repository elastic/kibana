/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash/fp';
import { ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';

import {
  ExceptionListClient,
  ExportExceptionListAndItemsReturn,
} from '../../../../../lists/server';

const NON_EXPORTABLE_LIST_IDS = [ENDPOINT_LIST_ID];
export const EXCEPTIONS_EXPORT_CHUNK_SIZE = 50;

export const getRuleExceptionsForExport = async (
  exceptions: ListArray,
  exceptionsListClient: ExceptionListClient | undefined
): Promise<{
  listCount: number;
  itemsCount: number;
  exportString: string | null;
}> => {
  if (exceptionsListClient != null) {
    const exceptionsWithoutUnexportableLists = exceptions.filter(
      ({ list_id: listId }) => !NON_EXPORTABLE_LIST_IDS.includes(listId)
    );
    return getExportableExceptions(exceptionsWithoutUnexportableLists, exceptionsListClient);
  } else {
    return { exportString: null, listCount: 0, itemsCount: 0 };
  }
};

export const getExportableExceptions = async (
  exceptions: ListArray,
  exceptionsListClient: ExceptionListClient
): Promise<{
  listCount: number;
  itemsCount: number;
  exportString: string;
}> => {
  let listCount = 0;
  let itemsCount = 0;
  let exportString = '';

  const exceptionChunks = chunk(EXCEPTIONS_EXPORT_CHUNK_SIZE, exceptions);
  for await (const exceptionChunk of exceptionChunks) {
    const promises = createPromises(exceptionsListClient, exceptionChunk);

    const responses = await Promise.all(promises);

    for (const res of responses) {
      console.log({ res: JSON.stringify(res) });
      const { exceptionListCount, exceptionListItemsCount, exportData } = res;

      listCount = listCount + exceptionListCount;
      itemsCount = itemsCount + exceptionListItemsCount;
      exportString = `${exportString}${exportData}`;
    }
  }

  return {
    listCount,
    itemsCount,
    exportString,
  };
};

/**
 * Creates promises of the rules and returns them.
 * @param exceptionsListClient Exception Lists client
 * @param exceptions The rules to apply the update for
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
