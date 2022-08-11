/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  CreateExceptionListItemSchemaDecoded,
  createExceptionListItemSchema,
  exceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildRouteValidation, buildSiemResponse } from './utils';
import { getExceptionListClient } from './utils/get_exception_list_client';
import { endpointDisallowedFields } from './endpoint_disallowed_fields';
import { validateEndpointExceptionItemEntries, validateExceptionListSize } from './validate';

export const createExceptionListItemRoute = (router: ListsPluginRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists-all'],
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
          tags,
          meta,
          comments,
          description,
          entries,
          item_id: itemId,
          list_id: listId,
          os_types: osTypes,
          type,
        } = request.body;
        const exceptionLists = await getExceptionListClient(context);
        const exceptionList = await exceptionLists.getExceptionList({
          id: undefined,
          listId,
          namespaceType,
        });
        if (exceptionList == null) {
          return siemResponse.error({
            body: `exception list id: "${listId}" does not exist`,
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
            if (exceptionList.type === 'endpoint') {
              const error = validateEndpointExceptionItemEntries(request.body.entries);
              if (error != null) {
                return siemResponse.error(error);
              }
              for (const entry of entries) {
                if (endpointDisallowedFields.includes(entry.field)) {
                  return siemResponse.error({
                    body: `cannot add endpoint exception item on field ${entry.field}`,
                    statusCode: 400,
                  });
                }
              }
            }
            const createdList = await exceptionLists.createExceptionListItem({
              comments,
              description,
              entries,
              itemId,
              listId,
              meta,
              name,
              namespaceType,
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
                listId,
                namespaceType
              );
              if (listSizeError != null) {
                await exceptionLists.deleteExceptionListItemById({
                  id: createdList.id,
                  namespaceType,
                });
                return siemResponse.error(listSizeError);
              }
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
