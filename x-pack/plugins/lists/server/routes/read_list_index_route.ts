/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { listItemIndexExistSchema } from '@kbn/securitysolution-io-ts-list-types';
import { LIST_INDEX } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse } from './utils';

import { getListClient } from '.';

export const readListIndexRoute = (router: ListsPluginRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: LIST_INDEX,
      validate: false,
    },
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const lists = await getListClient(context);
        const listIndexExists = await lists.getListIndexExists();
        const listItemIndexExists = await lists.getListItemIndexExists();

        if (listIndexExists || listItemIndexExists) {
          const [validated, errors] = validate(
            { list_index: listIndexExists, list_item_index: listItemIndexExists },
            listItemIndexExistSchema
          );
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else if (!listIndexExists && listItemIndexExists) {
          return siemResponse.error({
            body: `index ${lists.getListIndex()} does not exist`,
            statusCode: 404,
          });
        } else if (!listItemIndexExists && listIndexExists) {
          return siemResponse.error({
            body: `index ${lists.getListItemIndex()} does not exist`,
            statusCode: 404,
          });
        } else {
          return siemResponse.error({
            body: `index ${lists.getListIndex()} and index ${lists.getListItemIndex()} does not exist`,
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
