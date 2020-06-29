/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import { listSchema, patchListSchema } from '../../common/schemas';

import { getListClient } from '.';

export const patchListRoute = (router: IRouter): void => {
  router.patch(
    {
      options: {
        tags: ['access:lists'],
      },
      path: LIST_URL,
      validate: {
        body: buildRouteValidation(patchListSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { name, description, id, meta } = request.body;
        const lists = getListClient(context);
        // TODO: This looks like just a regular update, implement a patchListItem API and add plumbing for that.
        const list = await lists.updateList({ description, id, meta, name });
        if (list == null) {
          return siemResponse.error({
            body: `list id: "${id}" found found`,
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
