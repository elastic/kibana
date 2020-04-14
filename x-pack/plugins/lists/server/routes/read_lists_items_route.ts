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
import { ReadListsItemsSchema, readListsItemsSchema } from '../../common/schemas';
import { getListItemsByValues, getListItem } from '../items';
import { getList } from '../lists';
import { ConfigType } from '../config';

export const readListsItemsRoute = (
  router: IRouter,
  { listsIndex, listsItemsIndex }: ConfigType
): void => {
  router.get(
    {
      path: LIST_ITEM_URL,
      validate: {
        query: buildRouteValidationIoTS<ReadListsItemsSchema>(readListsItemsSchema),
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
          const listItem = await getListItem({
            id,
            clusterClient,
            listsItemsIndex,
          });
          if (listItem == null) {
            return siemResponse.error({
              statusCode: 404,
              body: `id: "${id}" item does not exist`,
            });
          } else {
            // TODO: outbound validation
            // TODO: Should we return this as an array since the other value below can be an array?
            return response.ok({ body: listItem });
          }
        } else if (listId != null && value != null) {
          const list = await getList({ id: listId, clusterClient, listsIndex });
          if (list == null) {
            return siemResponse.error({
              statusCode: 404,
              body: `list id: "${listId}" does not exist`,
            });
          } else {
            const listItems = await getListItemsByValues({
              type: list.type,
              listId,
              value: [value],
              clusterClient,
              listsItemsIndex,
            });
            if (!listItems.length) {
              // TODO: More specific error message that figures out which item value does not exist
              return siemResponse.error({
                statusCode: 404,
                body: `list_id: "${listId}" item does not exist`,
              });
            } else {
              // TODO: outbound validation
              return response.ok({ body: listItems });
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
