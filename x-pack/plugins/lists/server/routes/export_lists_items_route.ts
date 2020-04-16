/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Stream } from 'stream';

import { IRouter } from 'kibana/server';

import { LIST_ITEM_URL } from '../../common/constants';
import {
  transformError,
  buildSiemResponse,
  buildRouteValidationIoTS,
} from '../../../../legacy/plugins/siem/server/lib/detection_engine/routes/utils';
import { exportListsItemsQuerySchema, ExportListsItemsQuerySchema } from '../../common/schemas';

import { getListClient } from '.';

export const exportListsItemsRoute = (router: IRouter): void => {
  router.post(
    {
      path: `${LIST_ITEM_URL}/_export`,
      validate: {
        query: buildRouteValidationIoTS<ExportListsItemsQuerySchema>(exportListsItemsQuerySchema),
        // TODO: Do we want to add a body here like export_rules_route and allow a size limit?
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { list_id: listId } = request.query;
        const lists = getListClient(context);
        const list = await lists.getList({ id: listId });
        if (list == null) {
          return siemResponse.error({
            statusCode: 400,
            body: `list_id: ${listId} does not exist`,
          });
        } else {
          // TODO: Allow the API to override the name of the file to export
          const fileName = list.name;

          const stream = new Stream.PassThrough();
          lists.writeListItemsToStream({ listId, stream, stringToAppend: '\n' });
          return response.ok({
            headers: {
              'Content-Disposition': `attachment; filename="${fileName}"`,
              'Content-Type': 'text/plain',
            },
            body: stream,
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
