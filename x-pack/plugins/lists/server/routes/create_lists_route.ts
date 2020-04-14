/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_URL } from '../../common/constants';
// TODO: Change these from the legacy to the non-legacy
import {
  transformError,
  buildSiemResponse,
  buildRouteValidationIoTS,
} from '../../../../legacy/plugins/siem/server/lib/detection_engine/routes/utils';
import {
  createListsSchema,
  CreateListsSchema,
} from '../../common/schemas/request/create_lists_schema';
import { createList } from '../lists/create_list';
import { getList } from '../lists/get_list';
import { ConfigType } from '../config';

export const createListsRoute = (router: IRouter, { listsIndex }: ConfigType): void => {
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
        const clusterClient = context.core.elasticsearch.dataClient;
        // TODO: We need a await getIndexExists(clusterClient.callAsCurrentUser, index);
        // to throw an error if the index does not exist just yet
        if (id != null) {
          const list = await getList({ id, clusterClient, listsIndex });
          if (list != null) {
            return siemResponse.error({
              statusCode: 409,
              body: `list id: "${id}" already exists`,
            });
          }
        }
        const list = await createList({ name, description, id, clusterClient, listsIndex, type });
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
