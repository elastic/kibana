/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { EXCEPTION_LIST_ITEM_URL, MAX_EXCEPTION_LIST_SIZE } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import {
  CreateExceptionListItemSchemaDecoded,
  createExceptionListItemSchema,
  exceptionListItemSchema,
  foundExceptionListItemSchema,
} from '../../common/schemas';

import { getExceptionListClient } from './utils/get_exception_list_client';
import { endpointDisallowedFields } from './endpoint_disallowed_fields';

export const createExceptionListItemRoute = (router: IRouter): void => {
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
            if (exceptionList.type === 'endpoint') {
              for (const entry of entries) {
                if (entry.type === 'list') {
                  return siemResponse.error({
                    body: `cannot add exception item with entry of type "list" to endpoint exception list`,
                    statusCode: 400,
                  });
                }
                if (endpointDisallowedFields.includes(entry.field)) {
                  return siemResponse.error({
                    body: `cannot add endpoint exception item on field ${entry.field}`,
                    statusCode: 400,
                  });
                }
              }
            }
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
              const exceptionListItems = await exceptionLists.findExceptionListItem({
                filter: undefined,
                listId,
                namespaceType,
                page: undefined,
                perPage: undefined,
                sortField: undefined,
                sortOrder: undefined,
              });
              if (exceptionListItems == null) {
                // If exceptionListItems is null then we couldn't find the list so it may have been deleted -
                // delete the item we just created
                await exceptionLists.deleteExceptionListItemById({
                  id: createdList.id,
                  namespaceType,
                });
                return siemResponse.error({
                  body: `Unable to find list id: ${listId} to verify max exception list size`,
                  statusCode: 500,
                });
              }
              const [validatedItems, err] = validate(
                exceptionListItems,
                foundExceptionListItemSchema
              );
              if (err != null) {
                await exceptionLists.deleteExceptionListItemById({
                  id: createdList.id,
                  namespaceType,
                });
                return siemResponse.error({
                  body: err,
                  statusCode: 500,
                });
              }
              // Unnecessary since validatedItems comes from exceptionListItems which is already checked for null, but
              // typescript fails to detect that
              if (validatedItems == null) {
                await exceptionLists.deleteExceptionListItemById({
                  id: createdList.id,
                  namespaceType,
                });
                return siemResponse.error({
                  body: `Unable to find list id: ${listId} to verify max exception list size`,
                  statusCode: 500,
                });
              }
              if (validatedItems.total > MAX_EXCEPTION_LIST_SIZE) {
                await exceptionLists.deleteExceptionListItemById({
                  id: createdList.id,
                  namespaceType,
                });
                return siemResponse.error({
                  body: `Failed to add exception item, exception list would exceed max size of ${MAX_EXCEPTION_LIST_SIZE}`,
                  statusCode: 400,
                });
              } else {
                return response.ok({ body: validated ?? {} });
              }
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
