/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { apiCapabilities } from '../../common/features';
import type { GetWorkflowResponse } from '../../common/http_api/workflows';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';

export const registerWorkflowsRoutes = ({ router, logger, getServices }: RouteDependencies) => {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: '/internal/workchat-framework/workflows/{workflowId}',
      security: {
        authz: {
          requiredPrivileges: [apiCapabilities.useWorkchatFramework],
        },
      },
      validate: {
        params: schema.object({
          workflowId: schema.string(),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { workflowId } = request.params;
      const { workflowService } = getServices();

      const scopedService = await workflowService.asScoped({ request });
      const workflow = await scopedService.get(workflowId);

      return response.ok<GetWorkflowResponse>({ body: workflow });
    })
  );
};
