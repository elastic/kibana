/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import {
  INSTALLATION_STATUS_API_PATH,
  INSTALL_ALL_API_PATH,
  UNINSTALL_ALL_API_PATH,
  InstallationStatusResponse,
  PerformInstallResponse,
  UninstallResponse,
} from '../../common/http_api/installation';
import type { InternalServices } from '../types';

export const registerInstallationRoutes = ({
  router,
  getServices,
}: {
  router: IRouter;
  getServices: () => InternalServices;
}) => {
  router.get(
    {
      path: INSTALLATION_STATUS_API_PATH,
      validate: false,
      options: {
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['manage_llm_product_doc'],
          },
        },
      },
    },
    async (ctx, req, res) => {
      const { installClient, documentationManager } = getServices();
      const installStatus = await installClient.getInstallationStatus();
      const { status: overallStatus } = await documentationManager.getStatus();

      return res.ok<InstallationStatusResponse>({
        body: {
          perProducts: installStatus,
          overall: overallStatus,
        },
      });
    }
  );

  router.post(
    {
      path: INSTALL_ALL_API_PATH,
      validate: false,
      options: {
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['manage_llm_product_doc'],
          },
        },
        timeout: { idleSocket: 20 * 60 * 1000 }, // install can take time.
      },
    },
    async (ctx, req, res) => {
      const { documentationManager } = getServices();

      await documentationManager.install({
        force: false,
        wait: true,
      });

      return res.ok<PerformInstallResponse>({
        body: {
          installed: true,
        },
      });
    }
  );

  router.post(
    {
      path: UNINSTALL_ALL_API_PATH,
      validate: false,
      options: {
        access: 'internal',
        security: {
          authz: {
            requiredPrivileges: ['manage_llm_product_doc'],
          },
        },
      },
    },
    async (ctx, req, res) => {
      const { documentationManager } = getServices();

      await documentationManager.uninstall({ wait: true });

      return res.ok<UninstallResponse>({
        body: {
          success: true,
        },
      });
    }
  );
};
