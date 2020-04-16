/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_URL } from '../../common/constants';
import {
  transformError,
  buildSiemResponse,
  buildRouteValidationIoTS,
} from '../../../../legacy/plugins/siem/server/lib/detection_engine/routes/utils';
import { deleteListsSchema, DeleteListsSchema } from '../../common/schemas';

import { getListClient } from '.';

export const deleteListsRoute = (router: IRouter): void => {
  router.delete(
    {
      path: LIST_URL,
      validate: {
        query: buildRouteValidationIoTS<DeleteListsSchema>(deleteListsSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const lists = getListClient(context);
        const { id } = request.query;
        const deleted = await lists.deleteList({ id });
        if (deleted == null) {
          return siemResponse.error({
            statusCode: 404,
            body: `list id: "${id}" was not found`,
          });
        } else {
          // TODO: outbound validation
          return response.ok({ body: deleted });
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
