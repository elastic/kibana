/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';
import { exportExceptionListQuerySchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse, getExceptionListClient } from './utils';

export const exportExceptionListRoute = (router: ListsPluginRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: `${EXCEPTION_LIST_URL}/_export`,
      validate: {
        query: buildRouteValidation(exportExceptionListQuerySchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      console.log('HERE', { request: request.query });
      try {
        const { id, list_id: listId, namespace_type: namespaceType } = request.query;
        const exceptionLists = getExceptionListClient(context);
        const exceptionList = await exceptionLists.getExceptionList({
          id,
          listId,
          namespaceType,
        });

        if (exceptionList == null) {
          return siemResponse.error({
            body: `list_id: ${listId} does not exist`,
            statusCode: 400,
          });
        } else {
          const listItems = await exceptionLists.findExceptionListItem({
            filter: undefined,
            listId,
            namespaceType,
            page: 1,
            perPage: 10000,
            sortField: 'exception-list.created_at',
            sortOrder: 'desc',
          });
          const exceptionItems = listItems?.data ?? [];
          const { exportData } = getExport([exceptionList, ...exceptionItems]);
          const { exportDetails } = getExportDetails(exceptionItems);

          // TODO: Allow the API to override the name of the file to export
          const fileName = exceptionList.list_id;
          return response.ok({
            body: `${exportData}${exportDetails}`,
            headers: {
              'Content-Disposition': `attachment; filename="${fileName}"`,
              'Content-Type': 'application/ndjson',
            },
          });
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
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
  items: unknown[]
): {
  exportDetails: string;
} => {
  const exportDetails = JSON.stringify({
    exported_list_items_count: items.length,
  });
  return { exportDetails: `${exportDetails}\n` };
};
