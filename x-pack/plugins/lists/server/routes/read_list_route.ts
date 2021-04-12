/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListsPluginRouter } from '../types';
import { LIST_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/shared_imports';
import { listSchema, readListSchema } from '../../common/schemas';

import { getListClient } from '.';

export const readListRoute = (router: ListsPluginRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: LIST_URL,
      validate: {
        query: buildRouteValidation(readListSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id } = request.query;
        const lists = getListClient(context);
        const list = await lists.getList({ id });
        if (list == null) {
          return siemResponse.error({
            body: `list id: "${id}" does not exist`,
            statusCode: 404,
          });
        } else {
          const [validated, errors] = validate(list, listSchema);
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
