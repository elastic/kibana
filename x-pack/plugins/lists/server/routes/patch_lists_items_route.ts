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
import { patchListsItemsSchema, listsItemsSchema } from '../../common/schemas';

import { getListClient } from '.';

export const patchListsItemsRoute = (router: IRouter): void => {
  router.patch(
    {
      path: LIST_ITEM_URL,
      validate: {
        body: buildRouteValidation(patchListsItemsSchema),
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
          const [validated, errors] = validate(listItem, listsItemsSchema);
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? {} });
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
