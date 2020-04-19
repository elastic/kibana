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
  deleteListsItemsSchema,
  listsItemsSchema,
  listsItemsArraySchema,
} from '../../common/schemas';

import { getListClient } from '.';

export const deleteListsItemsRoute = (router: IRouter): void => {
  router.delete(
    {
      path: LIST_ITEM_URL,
      validate: {
        query: buildRouteValidation(deleteListsItemsSchema),
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
          const deleted = await lists.deleteListItem({ id });
          if (deleted == null) {
            return siemResponse.error({
              statusCode: 404,
              body: `list item with id: "${id}" item not found`,
            });
          } else {
            const [validated, errors] = validate(deleted, listsItemsSchema);
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
              body: `list_id: "${listId}" does not exist`,
            });
          } else {
            const deleted = await lists.deleteListItemByValue({ type: list.type, listId, value });
            if (deleted == null || deleted.length === 0) {
              return siemResponse.error({
                statusCode: 404,
                body: `list_id: "${listId}" with ${value} was not found`,
              });
            } else {
              const [validated, errors] = validate(deleted, listsItemsArraySchema);
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
