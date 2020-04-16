/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_ITEM_URL } from '../../common/constants';
import {
  transformError,
  buildSiemResponse,
  buildRouteValidationIoTS,
} from '../../../../legacy/plugins/siem/server/lib/detection_engine/routes/utils';
import {
  importListsItemsSchema,
  ImportListsItemsSchema,
  importListsItemsQuerySchema,
  ImportListsItemsQuerySchema,
} from '../../common/schemas';

import { getListClient } from '.';

export const importListsItemsRoute = (router: IRouter): void => {
  router.post(
    {
      path: `${LIST_ITEM_URL}/_import`,
      validate: {
        query: buildRouteValidationIoTS<ImportListsItemsQuerySchema>(importListsItemsQuerySchema),
        body: buildRouteValidationIoTS<ImportListsItemsSchema>(importListsItemsSchema),
      },
      options: {
        tags: ['access:siem'],
        body: {
          output: 'stream',
        },
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { list_id: listId, type } = request.query;
        const lists = getListClient(context);
        if (listId != null) {
          const list = await lists.getList({ id: listId });
          if (list == null) {
            return siemResponse.error({
              statusCode: 409,
              body: `list id: "${listId}" does not exist`,
            });
          }
          await lists.writeLinesToBulkListItems({
            listId,
            stream: request.body.file,
            type: list.type,
          });

          return response.accepted({
            body: {
              acknowledged: true,
            },
          });
        } else if (type != null) {
          const { filename } = request.body.file.hapi;
          // TODO: Should we prevent the same file from being uploaded multiple times?
          const list = await lists.createListIfItDoesNotExist({
            name: filename,
            id: filename,
            description: `File uploaded from file system of ${filename}`,
            type,
          });
          await lists.writeLinesToBulkListItems({
            listId: list.id,
            stream: request.body.file,
            type: list.type,
          });
          return response.accepted({
            body: {
              acknowledged: true,
            },
          });
        } else {
          return siemResponse.error({
            body: 'Either type or list_id need to be defined in the query',
            statusCode: 400,
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
