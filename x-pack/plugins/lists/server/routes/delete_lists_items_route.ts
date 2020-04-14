/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_ITEM_URL } from '../../common/constants';
// TODO: Move these utilities out of detection engine and into a more generic area
import {
  transformError,
  buildSiemResponse,
  buildRouteValidationIoTS,
} from '../../../../legacy/plugins/siem/server/lib/detection_engine/routes/utils';
import {
  DeleteListsItemsSchema,
  deleteListsItemsSchema,
} from '../../common/schemas/request/delete_lists_items_schema';
import { deleteListItemByValue } from '../items/delete_list_item_by_value';
import { getList } from '../lists/get_list';
import { deleteListItem } from '../items/delete_list_item';
import { ConfigType } from '../config';

export const deleteListsItemsRoute = (
  router: IRouter,
  { listsIndex, listsItemsIndex }: ConfigType
): void => {
  router.delete(
    {
      path: LIST_ITEM_URL,
      validate: {
        query: buildRouteValidationIoTS<DeleteListsItemsSchema>(deleteListsItemsSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, list_id: listId, value } = request.query;
        const clusterClient = context.core.elasticsearch.dataClient;
        if (id != null) {
          const deleted = await deleteListItem({
            id,
            clusterClient,
            listsItemsIndex,
          });
          if (deleted == null) {
            // TODO: More specifics on which item was not found
            return siemResponse.error({
              statusCode: 404,
              body: `list_id: "${id}" item not found`,
            });
          } else {
            // TODO: outbound validation
            return response.ok({ body: deleted });
          }
        } else if (listId != null && value != null) {
          const list = await getList({
            id: listId,
            clusterClient,
            listsIndex,
          });
          if (list == null) {
            return siemResponse.error({
              statusCode: 404,
              body: `list id: "${listId}" does not exist`,
            });
          }
          const deleted = await deleteListItemByValue({
            type: list.type,
            listId,
            value,
            clusterClient,
            listsItemsIndex,
          });
          if (deleted == null) {
            // TODO: More specifics on which item was not found
            return siemResponse.error({
              statusCode: 404,
              body: `list_id: "${id}" item not found`,
            });
          } else {
            // TODO: outbound validation
            return response.ok({ body: deleted });
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
