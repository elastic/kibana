/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionFilterSchema } from '../../../../../common/detection_engine/schemas/request';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_EXCEPTIONS_GET_FILTER } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

import type { ConfigType } from '../../../../config';
import type { SetupPlugins } from '../../../../plugin';
import { buildExceptionFilter } from '../../exceptions/build_exception_filter';

export const getExceptionFilterRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_EXCEPTIONS_GET_FILTER}`,
      validate: {
        body: buildRouteValidation(getExceptionFilterSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const ctx = await context.resolve(['securitySolution', 'lists']);
        const listClient = ctx.lists?.getListClient();
        if (!listClient) {
          return siemResponse.error({ statusCode: 500, body: 'Cannot retrieve list client' });
        }
        const exceptionListClient = ctx.securitySolution.getExceptionListClient();

        const exceptionItems: Array<ExceptionListItemSchema | CreateExceptionListItemSchema> = [];
        const { type } = request.body;
        if (type === 'exceptionListId') {
          const { exceptionListId, namespaceType } = request.body;
          const exceptionList = await exceptionListClient?.findExceptionListItem({
            listId: exceptionListId,
            namespaceType,
            page: undefined,
            perPage: undefined,
            filter: undefined,
            sortField: undefined,
            sortOrder: undefined,
          });
          if (!exceptionList) {
            return siemResponse.error({ statusCode: 500, body: 'Cannot find exception list' });
          }
          exceptionItems.push(...exceptionList.data);
        } else {
          const { exceptions } = request.body;
          exceptionItems.push(...exceptions);
        }

        const { alias = null, excludeExceptions = true, chunkSize = 1024 } = request.body;
        const { filter } = await buildExceptionFilter({
          lists: exceptionItems,
          alias,
          excludeExceptions,
          chunkSize,
          listClient,
        });

        return response.ok({ body: filter ?? {} });
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
