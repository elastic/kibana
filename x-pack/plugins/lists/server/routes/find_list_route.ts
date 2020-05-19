/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { LIST_URL } from '../../common/constants';
import {
  buildRouteValidation,
  buildSiemResponse,
  transformError,
  validate,
} from '../siem_server_deps';
import { findListSchema, foundListSchema } from '../../common/schemas';

import { getListClient } from './utils';

export const findListRoute = (router: IRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists'],
      },
      path: `${LIST_URL}/_find`,
      validate: {
        query: buildRouteValidation(findListSchema),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const lists = getListClient(context);
        const {
          filter,
          page,
          per_page: perPage,
          sort_field: sortField,
          sort_order: sortOrder,
        } = request.query;
        const exceptionList = await lists.findList({
          filter,
          page,
          perPage,
          sortField,
          sortOrder,
        });
        const [validated, errors] = validate(exceptionList, foundListSchema);
        if (errors != null) {
          return siemResponse.error({ body: errors, statusCode: 500 });
        } else {
          return response.ok({ body: validated ?? {} });
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
