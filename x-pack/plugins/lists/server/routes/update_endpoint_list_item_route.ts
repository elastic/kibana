/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { ENDPOINT_LIST_ITEM_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import {
  UpdateEndpointListItemSchemaDecoded,
  exceptionListItemSchema,
  updateEndpointListItemSchema,
} from '../../common/schemas';

import { getExceptionListClient } from '.';

export const updateEndpointListItemRoute = (router: IRouter): void => {
  router.put(
    {
      options: {
        tags: ['access:lists'],
      },
      path: ENDPOINT_LIST_ITEM_URL,
      validate: {
        body: buildRouteValidation<
          typeof updateEndpointListItemSchema,
          UpdateEndpointListItemSchemaDecoded
        >(updateEndpointListItemSchema),
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
          comments,
          entries,
          item_id: itemId,
          tags,
        } = request.body;
        const exceptionLists = getExceptionListClient(context);
        const exceptionListItem = await exceptionLists.updateEndpointListItem({
          _tags,
          comments,
          description,
          entries,
          id,
          itemId,
          meta,
          name,
          tags,
          type,
        });
        if (exceptionListItem == null) {
          if (id != null) {
            return siemResponse.error({
              body: `list item id: "${id}" not found`,
              statusCode: 404,
            });
          } else {
            return siemResponse.error({
              body: `list item item_id: "${itemId}" not found`,
              statusCode: 404,
            });
          }
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
