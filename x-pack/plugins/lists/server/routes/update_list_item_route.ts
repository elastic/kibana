/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_ITEM_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import { listItemSchema, updateListItemSchema } from '../../common/schemas';

import { getListClient } from '.';

export const updateListItemRoute = (router: IRouter): void => {
  router.put(
    {
      options: {
        tags: ['access:lists'],
      },
      path: LIST_ITEM_URL,
      validate: {
        body: buildRouteValidation(updateListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { value, id, meta } = request.body;
        const lists = getListClient(context);
        const listItem = await lists.updateListItem({
          id,
          meta,
          value,
        });
        if (listItem == null) {
          return siemResponse.error({
            body: `list item id: "${id}" not found`,
            statusCode: 404,
          });
        } else {
          const [validated, errors] = validate(listItem, listItemSchema);
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
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
