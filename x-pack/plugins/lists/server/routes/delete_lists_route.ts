/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_URL } from '../../common/constants';
import {
  buildRouteValidation,
  buildSiemResponse,
  transformError,
  validate,
} from '../siem_server_deps';
import { deleteListsSchema, listsSchema } from '../../common/schemas';

import { getListClient } from '.';

export const deleteListsRoute = (router: IRouter): void => {
  router.delete(
    {
      options: {
        tags: ['access:lists'],
      },
      path: LIST_URL,
      validate: {
        query: buildRouteValidation(deleteListsSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const lists = getListClient(context);
        const { id } = request.query;
        const deleted = await lists.deleteList({ id });
        if (deleted == null) {
          return siemResponse.error({
            body: `list id: "${id}" was not found`,
            statusCode: 404,
          });
        } else {
          const [validated, errors] = validate(deleted, listsSchema);
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
