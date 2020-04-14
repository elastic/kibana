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
  createListsItemsSchema,
  CreateListsItemsSchema,
} from '../../common/schemas/request/create_lists_items_schema';
import { createListItem } from '../items/create_list_item';
import { getList } from '../lists/get_list';
import { getListItemByValue } from '../items/get_list_item_by_value';
import { ConfigType } from '../config';

export const createListsItemsRoute = (
  router: IRouter,
  { listsIndex, listsItemsIndex }: ConfigType
): void => {
  router.post(
    {
      path: LIST_ITEM_URL,
      validate: {
        body: buildRouteValidationIoTS<CreateListsItemsSchema>(createListsItemsSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, list_id: listId, value } = request.body;
        const clusterClient = context.core.elasticsearch.dataClient;
        const list = await getList({ id: listId, clusterClient, listsIndex });
        if (list == null) {
          return siemResponse.error({
            statusCode: 404,
            body: `list id: "${listId}" does not exist`,
          });
        } else {
          const listItem = await getListItemByValue({
            listId,
            type: list.type,
            value,
            clusterClient,
            listsItemsIndex,
          });
          if (listItem != null) {
            return siemResponse.error({
              statusCode: 409,
              // TODO: Improve this error message by providing which list value
              body: `list_id: "${listId}" already contains the given list value`,
            });
          } else {
            const createdListItem = await createListItem({
              id,
              listId,
              type: list.type,
              value,
              clusterClient,
              listsItemsIndex,
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
