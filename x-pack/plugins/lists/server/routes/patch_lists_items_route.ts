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
import { patchListsItemsSchema, PatchListsItemsSchema } from '../../common/schemas';

import { getListClient } from '.';

// TODO: Make sure you write updateListItemRoute and update_list_item.sh routes

export const patchListsItemsRoute = (router: IRouter): void => {
  router.patch(
    {
      path: LIST_ITEM_URL,
      validate: {
        body: buildRouteValidationIoTS<PatchListsItemsSchema>(patchListsItemsSchema),
      },
      options: {
        tags: ['access:list'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { value, list_id: listId } = request.body;
        const lists = getListClient(context);
        const list = await lists.getList({ id: listId });
        if (list == null) {
          return siemResponse.error({
            statusCode: 404,
            body: `list id: "${listId}" does not exist`,
          });
        } else {
          const listItem = await lists.updateListItem({
            listId,
            type: list.type,
            value,
          });
          if (listItem == null) {
            return siemResponse.error({
              statusCode: 404,
              body: `list_id: "${listId}" found found`,
            });
          } else {
            // TODO: Transform and check the list on exit as well as validate it
            return response.ok({ body: listItem });
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
