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
import { updateListItem } from '../items';
import { getList } from '../lists';
import { ConfigType } from '../config';

// TODO: Make sure you write updateListItemRoute and update_list_item.sh routes

export const patchListsItemsRoute = (
  router: IRouter,
  { listsIndex, listsItemsIndex }: ConfigType
): void => {
  router.patch(
    {
      path: LIST_ITEM_URL,
      validate: {
        body: buildRouteValidationIoTS<PatchListsItemsSchema>(patchListsItemsSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { value, list_id: listId } = request.body;
        const clusterClient = context.core.elasticsearch.dataClient;
        const list = await getList({ id: listId, clusterClient, listsIndex });
        if (list == null) {
          return siemResponse.error({
            statusCode: 404,
            body: `list id: "${listId}" does not exist`,
          });
        } else {
          const listItem = await updateListItem({
            listId,
            type: list.type, // You cannot change a list type once created
            value,
            clusterClient,
            listsItemsIndex,
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
