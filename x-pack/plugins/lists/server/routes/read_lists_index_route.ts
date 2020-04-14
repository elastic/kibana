/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_INDEX } from '../../common/constants';
// TODO: Move these utilities out of detection engine and into a more generic area
import {
  transformError,
  buildSiemResponse,
} from '../../../../legacy/plugins/siem/server/lib/detection_engine/routes/utils';
import { getIndexExists } from '../../../../legacy/plugins/siem/server/lib/detection_engine/index/get_index_exists';
import { ConfigType } from '../config';

export const readListsIndexRoute = (
  router: IRouter,
  { listsIndex, listsItemsIndex }: ConfigType
): void => {
  router.get(
    {
      path: LIST_INDEX,
      validate: false,
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const clusterClient = context.core.elasticsearch.dataClient;
        const listsIndexExists = await getIndexExists(clusterClient.callAsCurrentUser, listsIndex);
        const listsItemsIndexExists = await getIndexExists(
          clusterClient.callAsCurrentUser,
          listsItemsIndex
        );

        if (listsIndexExists || listsItemsIndexExists) {
          return response.ok({
            body: { lists_index: listsIndexExists, lists_items_index: listsItemsIndexExists },
          });
        } else if (!listsIndexExists && listsItemsIndexExists) {
          return siemResponse.error({
            statusCode: 404,
            body: `index ${listsIndex} does not exist`,
          });
        } else if (!listsItemsIndexExists && listsIndexExists) {
          return siemResponse.error({
            statusCode: 404,
            body: `index ${listsItemsIndex} does not exist`,
          });
        } else {
          return siemResponse.error({
            statusCode: 404,
            body: `index ${listsIndex} and index ${listsItemsIndex} does not exist`,
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
