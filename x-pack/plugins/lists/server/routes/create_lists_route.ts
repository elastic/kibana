/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_URL } from '../../common/constants';
import {
  transformError,
  buildSiemResponse,
  buildRouteValidationIoTS,
} from '../../../../legacy/plugins/siem/server/lib/detection_engine/routes/utils';
import { createListsSchema, CreateListsSchema } from '../../common/schemas';

import { getListClient } from '.';

export const createListsRoute = (router: IRouter): void => {
  router.post(
    {
      path: LIST_URL,
      validate: {
        body: buildRouteValidationIoTS<CreateListsSchema>(createListsSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { name, description, id, type } = request.body;
        const lists = getListClient(context);
        // TODO: We need a await getIndexExists(clusterClient.callAsCurrentUser, index);
        // to throw an error if the index does not exist just yet
        if (id != null) {
          const list = await lists.getList({ id });
          if (list != null) {
            return siemResponse.error({
              statusCode: 409,
              body: `list id: "${id}" already exists`,
            });
          }
        }
        const list = await lists.createList({ id, name, description, type });
        // TODO: outbound validation
        return response.ok({ body: list });
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
