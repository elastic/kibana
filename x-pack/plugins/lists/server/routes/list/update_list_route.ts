/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { UpdateListRequestBody, UpdateListResponse } from '@kbn/securitysolution-lists-common/api';

import type { ListsPluginRouter } from '../../types';
import { buildSiemResponse } from '../utils';
import { getListClient } from '..';

export const updateListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .put({
      access: 'public',
      options: {
        tags: ['access:lists-all'],
      },
      path: LIST_URL,
    })
    .addVersion(
      {
        validate: {
          request: {
            body: buildRouteValidationWithZod(UpdateListRequestBody),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { name, description, id, meta, _version, version } = request.body;
          const lists = await getListClient(context);

          const dataStreamExists = await lists.getListDataStreamExists();
          // needs to be migrated to data stream if index exists
          if (!dataStreamExists) {
            const indexExists = await lists.getListIndexExists();
            if (indexExists) {
              await lists.migrateListIndexToDataStream();
            }
          }

          const list = await lists.updateList({ _version, description, id, meta, name, version });

          if (list == null) {
            return siemResponse.error({
              body: `list id: "${id}" not found`,
              statusCode: 404,
            });
          }

          return response.ok({ body: UpdateListResponse.parse(list) });
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
