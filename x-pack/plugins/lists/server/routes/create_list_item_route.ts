/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_ITEM_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { createListItemSchema, listItemSchema } from '../../common/schemas';
import { validate } from '../../common/siem_common_deps';

import { getListClient } from '.';

export const createListItemRoute = (router: IRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists'],
      },
      path: LIST_ITEM_URL,
      validate: {
        body: buildRouteValidation(createListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, list_id: listId, value, meta } = request.body;
        const lists = getListClient(context);
        const list = await lists.getList({ id: listId });
        if (list == null) {
          return siemResponse.error({
            body: `list id: "${listId}" does not exist`,
            statusCode: 404,
          });
        } else {
          const createdListItem = await lists.createListItem({
            deserializer: list.deserializer,
            id,
            listId,
            meta,
            serializer: list.serializer,
            type: list.type,
            value,
          });
          if (createdListItem != null) {
            const [validated, errors] = validate(createdListItem, listItemSchema);
            if (errors != null) {
              return siemResponse.error({ body: errors, statusCode: 500 });
            } else {
              return response.ok({ body: validated ?? {} });
            }
          } else {
            return siemResponse.error({
              body: 'list item invalid',
              statusCode: 400,
            });
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
