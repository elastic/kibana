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
import { createListsItemsSchema, CreateListsItemsSchema } from '../../common/schemas';

import { getListClient } from '.';

export const createListsItemsRoute = (router: IRouter): void => {
  router.post(
    {
      path: LIST_ITEM_URL,
      validate: {
        body: buildRouteValidationIoTS<CreateListsItemsSchema>(createListsItemsSchema),
      },
      options: {
        tags: ['access:list'],
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
          if (listItem != null) {
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
            // TODO: Transform and return this result set
            return response.ok({ body: createdListItem });
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
