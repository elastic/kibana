/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_INDEX } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../../types';
import { readListIndexResponse } from '../../../common/api';
import { buildSiemResponse } from '../utils';
import { getListClient } from '..';

export const readListIndexRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .get({
      access: 'public',
      options: {
        tags: ['access:lists-read'],
      },
      path: LIST_INDEX,
    })
    .addVersion(
      {
        validate: false,
        version: '2023-10-31',
      },
      async (context, _, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const lists = await getListClient(context);
          const listDataStreamExists = await lists.getListDataStreamExists();
          const listItemDataStreamExists = await lists.getListItemDataStreamExists();

          if (listDataStreamExists && listItemDataStreamExists) {
            const [validated, errors] = validate(
              { list_index: listDataStreamExists, list_item_index: listItemDataStreamExists },
              readListIndexResponse
            );
            if (errors != null) {
              return siemResponse.error({ body: errors, statusCode: 500 });
            } else {
              return response.ok({ body: validated ?? {} });
            }
          } else if (!listDataStreamExists && listItemDataStreamExists) {
            return siemResponse.error({
              body: `data stream ${lists.getListName()} does not exist`,
              statusCode: 404,
            });
          } else if (!listItemDataStreamExists && listDataStreamExists) {
            return siemResponse.error({
              body: `data stream ${lists.getListItemName()} does not exist`,
              statusCode: 404,
            });
          } else {
            return siemResponse.error({
              body: `data stream ${lists.getListName()} and data stream ${lists.getListItemName()} does not exist`,
              statusCode: 404,
            });
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
