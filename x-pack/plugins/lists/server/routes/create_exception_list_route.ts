/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'kibana/server';

import { EXCEPTION_LIST_URL } from '../../common/constants';
import { buildRouteValidation } from '../siem_server_deps';
import { createListSchema } from '../../common/schemas';

export const createExceptionListRoute = (router: IRouter): void => {
  router.post(
    {
      options: {
        tags: ['access:lists'],
      },
      path: EXCEPTION_LIST_URL,
      validate: {
        body: buildRouteValidation(createListSchema),
      },
    },
    async (context, request, response) => {
      // const siemResponse = buildSiemResponse(response);
      return response.ok({ body: { ok: 'starting stub' } });
    }
  );
};
