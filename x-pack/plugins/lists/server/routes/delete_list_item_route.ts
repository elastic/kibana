/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  deleteListItemSchema,
  listItemArraySchema,
  listItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse } from './utils';

import { getListClient } from '.';

export const deleteListItemRoute = (router: ListsPluginRouter): void => {
  router.delete(
    {
      options: {
        tags: ['access:lists-all'],
      },
      path: LIST_ITEM_URL,
      validate: {
        query: buildRouteValidation(deleteListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, list_id: listId, value } = request.query;
        const lists = await getListClient(context);
        if (id != null) {
          const deleted = await lists.deleteListItem({ id });
          if (deleted == null) {
            return siemResponse.error({
              body: `list item with id: "${id}" not found`,
              statusCode: 404,
            });
          } else {
            const [validated, errors] = validate(deleted, listItemSchema);
            if (errors != null) {
              return siemResponse.error({ body: errors, statusCode: 500 });
            } else {
              return response.ok({ body: validated ?? {} });
            }
          }
        } else if (listId != null && value != null) {
          const list = await lists.getList({ id: listId });
          if (list == null) {
            return siemResponse.error({
              body: `list_id: "${listId}" does not exist`,
              statusCode: 404,
            });
          } else {
            const deleted = await lists.deleteListItemByValue({
              listId,
              type: list.type,
              value,
            });
            if (deleted == null || deleted.length === 0) {
              return siemResponse.error({
                body: `list_id: "${listId}" with ${value} was not found`,
                statusCode: 404,
              });
            } else {
              const [validated, errors] = validate(deleted, listItemArraySchema);
              if (errors != null) {
                return siemResponse.error({ body: errors, statusCode: 500 });
              } else {
                return response.ok({ body: validated ?? {} });
              }
            }
          }
        } else {
          return siemResponse.error({
            body: 'Either "list_id" or "id" needs to be defined in the request',
            statusCode: 400,
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
