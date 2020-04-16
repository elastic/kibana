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
import { DeleteListsItemsSchema, deleteListsItemsSchema } from '../../common/schemas';

import { getListClient } from '.';

export const deleteListsItemsRoute = (router: IRouter): void => {
  router.delete(
    {
      path: LIST_ITEM_URL,
      validate: {
        query: buildRouteValidationIoTS<DeleteListsItemsSchema>(deleteListsItemsSchema),
      },
      options: {
        tags: ['access:list'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, list_id: listId, value } = request.query;
        const lists = getListClient(context);
        if (id != null) {
          const deleted = await lists.deleteListItem({ id });
          if (deleted == null) {
            return siemResponse.error({
              statusCode: 404,
              body: `list item with id: "${id}" item not found`,
            });
          } else {
            // TODO: outbound validation
            return response.ok({ body: deleted });
          }
        } else if (listId != null && value != null) {
          const list = await lists.getList({ id: listId });
          if (list == null) {
            return siemResponse.error({
              statusCode: 404,
              body: `list_id: "${listId}" does not exist`,
            });
          } else {
            const deleted = await lists.deleteListItemByValue({ type: list.type, listId, value });
            if (deleted == null) {
              return siemResponse.error({
                statusCode: 404,
                body: `list_id: "${listId}" with ${value} was not found`,
              });
            } else {
              // TODO: outbound validation
              return response.ok({ body: deleted });
            }
          }
        } else {
          return siemResponse.error({
            statusCode: 400,
            body: `Either "list_id" or "id" needs to be defined in the request`,
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
