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
import { exceptionListItemSchema, readExceptionListItemSchema } from '../../common/schemas';

import { getExceptionListClient } from './utils';

export const readExceptionListItemRoute = (router: IRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists'],
      },
      path: EXCEPTION_LIST_ITEM_URL,
      validate: {
        query: buildRouteValidation(readExceptionListItemSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, item_id: itemId } = request.query;
        const exceptionLists = getExceptionListClient(context);
        if (id != null || itemId != null) {
          const list = await exceptionLists.getExceptionListItem({
            id,
            itemId,
            // TODO: Bubble this up
            namespaceType: 'single',
          });
          if (list == null) {
            return siemResponse.error({
              body: getErrorMessage({ id, itemId }),
              statusCode: 404,
            });
          } else {
            const [validated, errors] = validate(list, exceptionListItemSchema);
            if (errors != null) {
              return siemResponse.error({ body: errors, statusCode: 500 });
            } else {
              return response.ok({ body: validated ?? {} });
            }
          }
        } else {
          return siemResponse.error({ body: 'id or item_id required', statusCode: 400 });
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

const getErrorMessage = ({
  id,
  itemId,
}: {
  id: string | undefined;
  itemId: string | undefined;
}): string => {
  if (id != null) {
    return `Exception list item id: "${id}" does not exist`;
  } else if (itemId != null) {
    return `Exception list item list_id: "${itemId}" does not exist`;
  } else {
    return 'Exception list item does not exist';
  }
};
