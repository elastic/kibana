/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_ITEM_URL } from '../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../siem_server_deps';
import { ReadListsItemsSchema, readListsItemsSchema } from '../../common/schemas';

import { getListClient } from '.';

export const readListsItemsRoute = (router: IRouter): void => {
  router.get(
    {
      path: LIST_ITEM_URL,
      validate: {
        query: buildRouteValidationIoTS<ReadListsItemsSchema>(readListsItemsSchema),
      },
      options: {
        tags: ['access:lists'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, list_id: listId, value } = request.query;
        const lists = getListClient(context);
        if (id != null) {
          const listItem = await lists.getListItem({ id });
          if (listItem == null) {
            return siemResponse.error({
              statusCode: 404,
              body: `list item id: "${id}" does not exist`,
            });
          } else {
            // TODO: outbound validation
            return response.ok({ body: listItem });
          }
        } else if (listId != null && value != null) {
          const list = await lists.getList({ id: listId });
          if (list == null) {
            return siemResponse.error({
              statusCode: 404,
              body: `list id: "${listId}" does not exist`,
            });
          } else {
            const listItem = await lists.getListItemByValue({
              type: list.type,
              listId,
              value,
            });
            if (!listItem) {
              return siemResponse.error({
                statusCode: 404,
                body: `list_id: "${listId}" item of ${value} does not exist`,
              });
            } else {
              // TODO: outbound validation
              return response.ok({ body: listItem });
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
