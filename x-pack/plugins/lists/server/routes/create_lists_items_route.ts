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
import { createListsItemsSchema, listsItemsSchema } from '../../common/schemas';

import { getListClient } from '.';

export const createListsItemsRoute = (router: IRouter): void => {
  router.post(
    {
      path: LIST_ITEM_URL,
      validate: {
        body: buildRouteValidation(createListsItemsSchema),
      },
      options: {
        tags: ['access:lists'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, list_id: listId, value } = request.body;
        const lists = getListClient(context);
        const list = await lists.getList({ id: listId });
        if (list == null) {
          return siemResponse.error({
            statusCode: 404,
            body: `list id: "${listId}" does not exist`,
          });
        } else {
          const listItem = await lists.getListItemByValue({ listId, type: list.type, value });
          if (listItem.length !== 0) {
            return siemResponse.error({
              statusCode: 409,
              body: `list_id: "${listId}" already contains the given value: ${value}`,
            });
          } else {
            const createdListItem = await lists.createListItem({
              id,
              listId,
              type: list.type,
              value,
            });
            const [validated, errors] = validate(createdListItem, listsItemsSchema);
            if (errors != null) {
              return siemResponse.error({ statusCode: 500, body: errors });
            } else {
              return response.ok({ body: validated ?? {} });
            }
          }
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
