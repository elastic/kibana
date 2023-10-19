/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../../types';
import { patchListItemRequest, patchListItemResponse } from '../../../common/api';
import { buildRouteValidation, buildSiemResponse } from '../utils';
import { getListClient } from '..';

export const patchListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .patch({
      access: 'public',
      options: {
        tags: ['access:lists-all'],
      },
      path: LIST_ITEM_URL,
    })
    .addVersion(
      {
        validate: {
          request: {
            body: buildRouteValidation(patchListItemRequest),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { value, id, meta, _version } = request.body;
          const lists = await getListClient(context);

          const dataStreamExists = await lists.getListItemDataStreamExists();
          // needs to be migrated to data stream if index exists
          if (!dataStreamExists) {
            const indexExists = await lists.getListItemIndexExists();
            if (indexExists) {
              await lists.migrateListItemIndexToDataStream();
            }
          }

          const listItem = await lists.patchListItem({
            _version,
            id,
            meta,
            value,
          });
          if (listItem == null) {
            return siemResponse.error({
              body: `list item id: "${id}" not found`,
              statusCode: 404,
            });
          } else {
            const [validated, errors] = validate(listItem, patchListItemResponse);
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
