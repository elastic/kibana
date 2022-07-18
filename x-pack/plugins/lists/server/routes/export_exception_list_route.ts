/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { exportExceptionListQuerySchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse, getExceptionListClient } from './utils';

export const exportExceptionsRoute = (router: ListsPluginRouter): void => {
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

      try {
        const { id, list_id: listId, namespace_type: namespaceType } = request.query;
        const exceptionListsClient = await getExceptionListClient(context);

        const exportContent = await exceptionListsClient.exportExceptionListAndItems({
          id,
          listId,
          namespaceType,
        });

        if (exportContent == null) {
          return siemResponse.error({
            body: `exception list with list_id: ${listId} or id: ${id} does not exist`,
            statusCode: 400,
          });
        }

        return response.ok({
          body: `${exportContent.exportData}${JSON.stringify(exportContent.exportDetails)}\n`,
          headers: {
            'Content-Disposition': `attachment; filename="${listId}"`,
            'Content-Type': 'application/ndjson',
          },
        });
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
