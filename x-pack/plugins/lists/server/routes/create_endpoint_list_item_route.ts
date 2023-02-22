/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  CreateEndpointListItemSchemaDecoded,
  createEndpointListItemSchema,
  exceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_LIST_ID, ENDPOINT_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse, getExceptionListClient } from './utils';
import { validateExceptionListSize } from './validate';

export const createEndpointListItemRoute = (router: ListsPluginRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists-all'],
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
          tags,
          meta,
          comments,
          description,
          entries,
          item_id: itemId,
          os_types: osTypes,
          type,
        } = request.body;
        const exceptionLists = await getExceptionListClient(context);
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
            comments,
            description,
            entries,
            itemId,
            meta,
            name,
            osTypes,
            tags,
            type,
          });
          const [validated, errors] = validate(createdList, exceptionListItemSchema);
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            const listSizeError = await validateExceptionListSize(
              exceptionLists,
              ENDPOINT_LIST_ID,
              'agnostic'
            );
            if (listSizeError != null) {
              await exceptionLists.deleteExceptionListItemById({
                id: createdList.id,
                namespaceType: 'agnostic',
              });
              return siemResponse.error(listSizeError);
            }
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
