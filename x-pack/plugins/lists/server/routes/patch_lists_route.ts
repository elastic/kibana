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
import { patchListsSchema, PatchListsSchema } from '../../common/schemas';

import { getListClient } from '.';

// TODO: Make sure you write updateListRoute and update_list.sh routes

export const patchListsRoute = (router: IRouter): void => {
  router.patch(
    {
      path: LIST_URL,
      validate: {
        body: buildRouteValidationIoTS<PatchListsSchema>(patchListsSchema),
      },
      options: {
        tags: ['access:list'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { name, description, id } = request.body;
        const lists = getListClient(context);
        const list = await lists.updateList({ id, name, description });
        if (list == null) {
          return siemResponse.error({
            statusCode: 404,
            body: `list id: "${id}" found found`,
          });
        } else {
          // TODO: Transform and check the list on exit as well as validate it
          return response.ok({ body: list });
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
