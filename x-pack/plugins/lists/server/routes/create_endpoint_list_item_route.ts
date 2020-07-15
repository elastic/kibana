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
  CreateEndpointListItemSchemaDecoded,
  createEndpointListItemSchema,
  exceptionListItemSchema,
} from '../../common/schemas';

import { getExceptionListClient } from './utils/get_exception_list_client';

export const createEndpointListItemRoute = (router: IRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists'],
      },
      path: ENDPOINT_LIST_ITEM_URL,
      validate: {
        body: buildRouteValidation<
          typeof createEndpointListItemSchema,
          CreateEndpointListItemSchemaDecoded
        >(createEndpointListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const {
          name,
          _tags,
          tags,
          meta,
          comments,
          description,
          entries,
          item_id: itemId,
          type,
        } = request.body;
        const exceptionLists = getExceptionListClient(context);
        const exceptionListItem = await exceptionLists.getEndpointListItem({
          id: undefined,
          itemId,
        });
        if (exceptionListItem != null) {
          return siemResponse.error({
            body: `exception list item id: "${itemId}" already exists`,
            statusCode: 409,
          });
        } else {
          const createdList = await exceptionLists.createEndpointListItem({
            _tags,
            comments,
            description,
            entries,
            itemId,
            meta,
            name,
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
