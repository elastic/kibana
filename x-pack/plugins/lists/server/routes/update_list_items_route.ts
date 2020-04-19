/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_ITEM_URL } from '../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidation } from '../siem_server_deps';
import { updateListsItemsSchema } from '../../common/schemas';

import { getListClient } from '.';

export const updateListsItemsRoute = (router: IRouter): void => {
  router.put(
    {
      path: LIST_ITEM_URL,
      validate: {
        body: buildRouteValidation(updateListsItemsSchema),
      },
      options: {
        tags: ['access:lists'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { value, id } = request.body;
        const lists = getListClient(context);
        const listItem = await lists.updateListItem({
          id,
          value,
          // TODO: Add the meta object here
        });
        if (listItem == null) {
          return siemResponse.error({
            statusCode: 404,
            body: `list item id: "${id}" not found`,
          });
        } else {
          // TODO: Transform and check the list on exit as well as validate it
          return response.ok({ body: listItem });
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
