/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/shared_imports';
import { listSchema, updateListSchema } from '../../common/schemas';

import { getListClient } from '.';

export const updateListRoute = (router: IRouter): void => {
  router.put(
    {
      options: {
        tags: ['access:lists-all'],
      },
      path: LIST_URL,
      validate: {
        body: buildRouteValidation(updateListSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { name, description, id, meta, _version, version } = request.body;
        const lists = getListClient(context);
        const list = await lists.updateList({ _version, description, id, meta, name, version });
        if (list == null) {
          return siemResponse.error({
            body: `list id: "${id}" not found`,
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
