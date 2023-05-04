/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { createListItemSchema, listItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse } from './utils';

import { getListClient } from '.';

export const createListItemRoute = (router: ListsPluginRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists-all'],
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
        const lists = await getListClient(context);
        const list = await lists.getList({ id: listId });
        if (list == null) {
          return siemResponse.error({
            body: `list id: "${listId}" does not exist`,
            statusCode: 404,
          });
        } else {
          if (id != null) {
            const listItem = await lists.getListItem({ id });
            if (listItem != null) {
              return siemResponse.error({
                body: `list item id: "${id}" already exists`,
                statusCode: 409,
              });
            }
          }
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
