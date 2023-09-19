/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import type { IKibanaResponse } from '@kbn/core/server';

import { CreateSharedExceptionListRequest } from '../../../../../common/api/detection_engine';
import { SHARED_EXCEPTION_LIST_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildSiemResponse } from '../../../detection_engine/routes/utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

export const createSharedExceptionListRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: SHARED_EXCEPTION_LIST_URL,
      access: 'public',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidation<
              typeof CreateSharedExceptionListRequest,
              CreateSharedExceptionListRequest
            >(CreateSharedExceptionListRequest),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ExceptionListSchema>> => {
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
            listId: uuidv4(),
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
