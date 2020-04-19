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
  buildRouteValidation,
  validate,
} from '../siem_server_deps';
import {
  readListsItemsSchema,
  listsItemsSchema,
  listsItemsArraySchema,
} from '../../common/schemas';

import { getListClient } from '.';

export const readListsItemsRoute = (router: IRouter): void => {
  router.get(
    {
      path: LIST_ITEM_URL,
      validate: {
        query: buildRouteValidation(readListsItemsSchema),
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
            const [validated, errors] = validate(listItem, listsItemsSchema);
            if (errors != null) {
              return siemResponse.error({ statusCode: 500, body: errors });
            } else {
              return response.ok({ body: validated ?? {} });
            }
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
            if (listItem.length === 0) {
              return siemResponse.error({
                statusCode: 404,
                body: `list_id: "${listId}" item of ${value} does not exist`,
              });
            } else {
              const [validated, errors] = validate(listItem, listsItemsArraySchema);
              if (errors != null) {
                return siemResponse.error({ statusCode: 500, body: errors });
              } else {
                return response.ok({ body: validated ?? {} });
              }
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
