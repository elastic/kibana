/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { updateExceptionListItemValidate } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';
import {
  UpdateExceptionListItemRequestDecoded,
  updateExceptionListItemRequest,
  updateExceptionListItemResponse,
} from '../../common/api';

import { buildRouteValidation, buildSiemResponse } from './utils';

import { getExceptionListClient } from '.';

export const updateExceptionListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .put({
      access: 'public',
      options: {
        tags: ['access:lists-all'],
      },
      path: EXCEPTION_LIST_ITEM_URL,
    })
    .addVersion(
      {
        validate: {
          request: {
            body: buildRouteValidation<
              typeof updateExceptionListItemRequest,
              UpdateExceptionListItemRequestDecoded
            >(updateExceptionListItemRequest),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const validationErrors = updateExceptionListItemValidate(request.body);
        if (validationErrors.length) {
          return siemResponse.error({ body: validationErrors, statusCode: 400 });
        }

        try {
          const {
            description,
            id,
            name,
            meta,
            type,
            _version,
            comments,
            entries,
            item_id: itemId,
            namespace_type: namespaceType,
            os_types: osTypes,
            tags,
            expire_time: expireTime,
          } = request.body;
          if (id == null && itemId == null) {
            return siemResponse.error({
              body: 'either id or item_id need to be defined',
              statusCode: 404,
            });
          } else {
            const exceptionLists = await getExceptionListClient(context);
            const exceptionListItem = await exceptionLists.updateOverwriteExceptionListItem({
              _version,
              comments,
              description,
              entries,
              expireTime,
              id,
              itemId,
              meta,
              name,
              namespaceType,
              osTypes,
              tags,
              type,
            });
            if (exceptionListItem == null) {
              if (id != null) {
                return siemResponse.error({
                  body: `exception list item id: "${id}" does not exist`,
                  statusCode: 404,
                });
              } else {
                return siemResponse.error({
                  body: `exception list item item_id: "${itemId}" does not exist`,
                  statusCode: 404,
                });
              }
            } else {
              const [validated, errors] = validate(
                exceptionListItem,
                updateExceptionListItemResponse
              );
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
