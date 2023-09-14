/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../../types';
import {
  readListItemArrayResponse,
  readListItemRequestQuery,
  readListItemResponse,
} from '../../../common/api';
import { buildRouteValidation, buildSiemResponse } from '../utils';
import { getListClient } from '..';

export const readListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .get({
      access: 'public',
      options: {
        tags: ['access:lists-read'],
      },
      path: LIST_ITEM_URL,
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidation(readListItemRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { id, list_id: listId, value } = request.query;
          const lists = await getListClient(context);
          if (id != null) {
            const listItem = await lists.getListItem({ id });
            if (listItem == null) {
              return siemResponse.error({
                body: `list item id: "${id}" does not exist`,
                statusCode: 404,
              });
            } else {
              const [validated, errors] = validate(listItem, readListItemResponse);
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
                body: `list id: "${listId}" does not exist`,
                statusCode: 404,
              });
            } else {
              const listItem = await lists.getListItemByValue({
                listId,
                type: list.type,
                value,
              });
              if (listItem.length === 0) {
                return siemResponse.error({
                  body: `list_id: "${listId}" item of ${value} does not exist`,
                  statusCode: 404,
                });
              } else {
                const [validated, errors] = validate(listItem, readListItemArrayResponse);
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
