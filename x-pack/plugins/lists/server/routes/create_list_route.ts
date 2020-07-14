/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_URL } from '../../common/constants';
import { buildRouteValidation, buildSiemResponse, transformError } from '../siem_server_deps';
import { validate } from '../../common/siem_common_deps';
import { createListSchema, listSchema } from '../../common/schemas';

import { getListClient } from '.';

export const createListRoute = (router: IRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists'],
      },
      path: LIST_URL,
      validate: {
        body: buildRouteValidation(createListSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { name, description, deserializer, id, serializer, type, meta } = request.body;
        const lists = getListClient(context);
        const listExists = await lists.getListIndexExists();
        if (!listExists) {
          return siemResponse.error({
            body: `To create a list, the index must exist first. Index "${lists.getListIndex()}" does not exist`,
            statusCode: 400,
          });
        } else {
          if (id != null) {
            const list = await lists.getList({ id });
            if (list != null) {
              return siemResponse.error({
                body: `list id: "${id}" already exists`,
                statusCode: 409,
              });
            }
          }
          const list = await lists.createList({
            description,
            deserializer,
            id,
            meta,
            name,
            serializer,
            type,
          });
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
