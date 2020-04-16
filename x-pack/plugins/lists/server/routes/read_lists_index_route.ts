/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_INDEX } from '../../common/constants';
import {
  transformError,
  buildSiemResponse,
} from '../../../../legacy/plugins/siem/server/lib/detection_engine/routes/utils';

import { getListClient } from '.';

export const readListsIndexRoute = (router: IRouter): void => {
  router.get(
    {
      path: LIST_INDEX,
      validate: false,
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const lists = getListClient(context);
        const listsIndexExists = await lists.getListIndexExists();
        const listsItemsIndexExists = await lists.getListItemIndexExists();

        if (listsIndexExists || listsItemsIndexExists) {
          return response.ok({
            body: { lists_index: listsIndexExists, lists_items_index: listsItemsIndexExists },
          });
        } else if (!listsIndexExists && listsItemsIndexExists) {
          return siemResponse.error({
            statusCode: 404,
            body: `index ${lists.getListIndex()} does not exist`,
          });
        } else if (!listsItemsIndexExists && listsIndexExists) {
          return siemResponse.error({
            statusCode: 404,
            body: `index ${lists.getListItemIndex()} does not exist`,
          });
        } else {
          return siemResponse.error({
            statusCode: 404,
            body: `index ${lists.getListIndex()} and index ${lists.getListItemIndex()} does not exist`,
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
