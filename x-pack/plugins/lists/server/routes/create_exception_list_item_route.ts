/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { EXCEPTION_LIST_ITEM_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import {
  CreateExceptionListItemSchemaDecoded,
  createExceptionListItemSchema,
  exceptionListItemSchema,
} from '../../common/schemas';

import { getExceptionListClient } from './utils/get_exception_list_client';

export const createExceptionListItemRoute = (router: IRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists'],
      },
      path: EXCEPTION_LIST_ITEM_URL,
      validate: {
        body: buildRouteValidation<
          typeof createExceptionListItemSchema,
          CreateExceptionListItemSchemaDecoded
        >(createExceptionListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const {
          namespace_type: namespaceType,
          name,
          _tags,
          tags,
          meta,
          comments,
          description,
          entries,
          item_id: itemId,
          list_id: listId,
          type,
        } = request.body;
        const exceptionLists = getExceptionListClient(context);
        const exceptionList = await exceptionLists.getExceptionList({
          id: undefined,
          listId,
          namespaceType,
        });
        if (exceptionList == null) {
          return siemResponse.error({
            body: `list id: "${listId}" does not exist`,
            statusCode: 404,
          });
        } else {
          const exceptionListItem = await exceptionLists.getExceptionListItem({
            id: undefined,
            itemId,
            namespaceType,
          });
          if (exceptionListItem != null) {
            return siemResponse.error({
              body: `exception list item id: "${itemId}" already exists`,
              statusCode: 409,
            });
          } else {
            const createdList = await exceptionLists.createExceptionListItem({
              _tags,
              comments,
              description,
              entries,
              itemId,
              listId,
              meta,
              name,
              namespaceType,
              tags,
              type,
            });
            const [validated, errors] = validate(createdList, exceptionListItemSchema);
            if (errors != null) {
              return siemResponse.error({ body: errors, statusCode: 500 });
            } else {
              return response.ok({ body: validated ?? {} });
            }
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
