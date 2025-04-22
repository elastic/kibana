/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { apiCapabilities } from '../../common/features';

export const registerWorkflowsRoutes = ({ router, getServices }: RouteDependencies) => {
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
    async (ctx, req, res) => {
      // not implemented yet
      return res.badRequest();
    }
  );
};
