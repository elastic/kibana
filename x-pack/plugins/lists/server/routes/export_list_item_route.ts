/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Stream } from 'stream';

import { transformError } from '@kbn/securitysolution-es-utils';
import { exportListItemQuerySchema } from '@kbn/securitysolution-io-ts-list-types';
import { LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse } from './utils';

import { getListClient } from '.';

export const exportListItemRoute = (router: ListsPluginRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: `${LIST_ITEM_URL}/_export`,
      validate: {
        query: buildRouteValidation(exportListItemQuerySchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { list_id: listId } = request.query;
        const lists = await getListClient(context);
        const list = await lists.getList({ id: listId });
        if (list == null) {
          return siemResponse.error({
            body: `list_id: ${listId} does not exist`,
            statusCode: 400,
          });
        } else {
          // TODO: Allow the API to override the name of the file to export
          const fileName = list.name;

          const stream = new Stream.PassThrough();
          lists.exportListItemsToStream({ listId, stream, stringToAppend: '\n' });
          return response.ok({
            body: stream,
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
