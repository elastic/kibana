/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import uuid from 'uuid';

import { SHARED_EXCEPTION_LIST_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildSiemResponse } from '../../../detection_engine/routes/utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

/**
 * URL path parameters of the API route.
 */
export const CreateSharedExceptionListRequestParams = t.exact(
  t.type({
    name: t.string,
    description: t.string,
  })
);
export type CreateSharedExceptionListRequestParams = t.TypeOf<
  typeof CreateSharedExceptionListRequestParams
>;

export type CreateSharedExceptionListRequestParamsDecoded = CreateSharedExceptionListRequestParams;

export const createSharedExceptionListRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: SHARED_EXCEPTION_LIST_URL,
      validate: {
        body: buildRouteValidation<
          typeof CreateSharedExceptionListRequestParams,
          CreateSharedExceptionListRequestParams
        >(CreateSharedExceptionListRequestParams),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const { description, name } = request.body;

      try {
        const ctx = await context.resolve([
          'core',
          'securitySolution',
          'alerting',
          'licensing',
          'lists',
        ]);
        const listsClient = ctx.securitySolution.getExceptionListClient();
        const createdSharedList = await listsClient?.createExceptionList({
          description,
          immutable: false,
          listId: uuid.v4(),
          meta: undefined,
          name,
          namespaceType: 'single',
          tags: [],
          type: 'detection',
          version: 1,
        });
        return response.ok({ body: createdSharedList });
      } catch (exc) {
        return siemResponse.error({
          body: exc.message,
          statusCode: 404,
        });
      }
    }
  );
};
