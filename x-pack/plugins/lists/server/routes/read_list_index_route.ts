/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_INDEX } from '../../common/constants';
import { buildSiemResponse, transformError, validate } from '../siem_server_deps';
import { listsItemsIndexExistSchema } from '../../common/schemas';

import { getListClient } from '.';

export const readListIndexRoute = (router: IRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists'],
      },
      path: LIST_INDEX,
      validate: false,
    },
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const lists = getListClient(context);
        const listsIndexExists = await lists.getListIndexExists();
        const listsItemsIndexExists = await lists.getListItemIndexExists();

        if (listsIndexExists || listsItemsIndexExists) {
          const [validated, errors] = validate(
            { lists_index: listsIndexExists, lists_items_index: listsItemsIndexExists },
            listsItemsIndexExistSchema
          );
          if (errors != null) {
            return siemResponse.error({ body: errors, statusCode: 500 });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else if (!listsIndexExists && listsItemsIndexExists) {
          return siemResponse.error({
            body: `index ${lists.getListIndex()} does not exist`,
            statusCode: 404,
          });
        } else if (!listsItemsIndexExists && listsIndexExists) {
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
