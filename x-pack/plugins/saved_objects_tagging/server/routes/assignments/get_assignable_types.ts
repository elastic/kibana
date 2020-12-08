/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';
import { GetAssignableTypesResponse } from '../../../common/http_api_types';

export const registerGetAssignableTypesRoute = (router: IRouter) => {
  router.get(
    {
      path: '/internal/saved_objects_tagging/assignments/_assignable_types',
      validate: {},
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { assignmentService } = ctx.tags!;
      const types = await assignmentService.getAssignableTypes();

      return res.ok({
        body: {
          types,
        } as GetAssignableTypesResponse,
      });
    })
  );
};
