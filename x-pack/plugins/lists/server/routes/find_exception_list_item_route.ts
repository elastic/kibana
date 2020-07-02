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
  FindExceptionListItemSchemaDecoded,
  findExceptionListItemSchema,
  foundExceptionListItemSchema,
} from '../../common/schemas';

import { getExceptionListClient } from './utils';

export const findExceptionListItemRoute = (router: IRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists'],
      },
      path: `${EXCEPTION_LIST_ITEM_URL}/_find`,
      validate: {
        query: buildRouteValidation<
          typeof findExceptionListItemSchema,
          FindExceptionListItemSchemaDecoded
        >(findExceptionListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const exceptionLists = getExceptionListClient(context);
        const {
          filter,
          list_id: listId,
          namespace_type: namespaceType,
          page,
          per_page: perPage,
          sort_field: sortField,
          sort_order: sortOrder,
        } = request.query;
        const exceptionListItems = await exceptionLists.findExceptionListItem({
          filter,
          listId,
          namespaceType,
          page,
          perPage,
          sortField,
          sortOrder,
        });
        if (exceptionListItems == null) {
          return siemResponse.error({
            body: `list id: "${listId}" does not exist`,
            statusCode: 404,
          });
        }
        const [validated, errors] = validate(exceptionListItems, foundExceptionListItemSchema);
        if (errors != null) {
          return siemResponse.error({ body: errors, statusCode: 500 });
        } else {
          return response.ok({ body: validated ?? {} });
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
