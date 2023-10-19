/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../../types';
import {
  CreateListRequestDecoded,
  createListRequest,
  createListResponse,
} from '../../../common/api';
import { buildRouteValidation, buildSiemResponse } from '../utils';
import { getListClient } from '..';

export const createListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
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
            body: buildRouteValidation<typeof createListRequest, CreateListRequestDecoded>(
              createListRequest
            ),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { name, description, deserializer, id, serializer, type, meta, version } =
            request.body;
          const lists = await getListClient(context);
          const dataStreamExists = await lists.getListDataStreamExists();
          const indexExists = await lists.getListIndexExists();

          if (!dataStreamExists && !indexExists) {
            return siemResponse.error({
              body: `To create a list, the data stream must exist first. Data stream "${lists.getListName()}" does not exist`,
              statusCode: 400,
            });
          } else {
            // needs to be migrated to data stream
            if (!dataStreamExists && indexExists) {
              await lists.migrateListIndexToDataStream();
            }
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
              immutable: false,
              meta,
              name,
              serializer,
              type,
              version,
            });
            const [validated, errors] = validate(list, createListResponse);
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
