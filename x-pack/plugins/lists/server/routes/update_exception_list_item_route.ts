/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  UpdateExceptionListItemRequestBody,
  UpdateExceptionListItemResponse,
} from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse } from './utils';
import { validateCommentsToUpdate } from './utils/validate_comments_to_update';

import { getExceptionListClient } from '.';

export const updateExceptionListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .put({
      access: 'public',
      path: EXCEPTION_LIST_ITEM_URL,
      security: {
        authz: {
          requiredPrivileges: ['lists-all'],
        },
      },
    })
    .addVersion(
      {
        validate: {
          request: {
            body: buildRouteValidationWithZod(UpdateExceptionListItemRequestBody),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validateCommentsToUpdate(request.body.comments);
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
          }

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
            return siemResponse.error({
              body:
                id != null
                  ? `exception list item id: "${id}" does not exist`
                  : `exception list item item_id: "${itemId}" does not exist`,
              statusCode: 404,
            });
          }

          return response.ok({
            body: UpdateExceptionListItemResponse.parse(exceptionListItem),
          });
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
