/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import { deleteListSchema, listSchema } from '../../common/schemas';

import { getListClient } from '.';

export const deleteListRoute = (router: IRouter): void => {
  router.delete(
    {
      options: {
        tags: ['access:lists'],
      },
      path: LIST_URL,
      validate: {
        query: buildRouteValidation(deleteListSchema),
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
          const [validated, errors] = validate(deleted, listSchema);
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
