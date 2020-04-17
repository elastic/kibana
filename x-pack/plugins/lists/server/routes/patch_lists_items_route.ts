/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_ITEM_URL } from '../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../siem_server_deps';
import { patchListsItemsSchema, PatchListsItemsSchema } from '../../common/schemas';

import { getListClient } from '.';

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
