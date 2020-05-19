/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { EXCEPTION_LIST_ITEM_URL } from '../../common/constants';
import {
  buildRouteValidation,
  buildSiemResponse,
  transformError,
  validate,
} from '../siem_server_deps';
import {
  UpdateExceptionListItemSchemaDecoded,
  exceptionListItemSchema,
  updateExceptionListItemSchema,
} from '../../common/schemas';

import { getExceptionListClient } from '.';

export const updateExceptionListItemRoute = (router: IRouter): void => {
  router.put(
    {
      options: {
        tags: ['access:lists'],
      },
      path: EXCEPTION_LIST_ITEM_URL,
      validate: {
        body: buildRouteValidation<
          typeof updateExceptionListItemSchema,
          UpdateExceptionListItemSchemaDecoded
        >(updateExceptionListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const {
          description,
          id,
          name,
          meta,
          type,
          _tags,
          comment,
          entries,
          item_id: itemId,
          tags,
        } = request.body;
        const exceptionLists = getExceptionListClient(context);
        const exceptionListItem = await exceptionLists.updateExceptionListItem({
          _tags,
          comment,
          description,
          entries,
          id,
          itemId,
          meta,
          name,
          namespaceType: 'single', // TODO: Bubble this up
          tags,
          type,
        });
        if (exceptionListItem == null) {
          return siemResponse.error({
            body: `list item id: "${id}" not found`,
            statusCode: 404,
          });
        } else {
          const [validated, errors] = validate(exceptionListItem, exceptionListItemSchema);
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
