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
import { InstallationStatus } from '../../common/install_status';
import type { InternalServices } from '../types';
import { checkLicense } from '../services/package_installer';
import { scheduleInstallAllTask, scheduleUninstallAllTask, waitUntilTaskCompleted } from '../tasks';

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
      const { installClient } = getServices();
      const installStatus = await installClient.getInstallationStatus();
      const overallStatus = getOverallStatus(Object.values(installStatus).map((v) => v.status));

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
      const { licensing, taskManager, logger } = getServices();

      const license = await licensing.getLicense();
      if (!checkLicense(license)) {
        return res.badRequest({
          body: 'Elastic documentation requires an enterprise license',
        });
      }

      const taskId = await scheduleInstallAllTask({ taskManager, logger });
      await waitUntilTaskCompleted({ taskId, taskManager, timeout: 10 * 60 });

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
      const { taskManager, logger } = getServices();

      const taskId = await scheduleUninstallAllTask({ taskManager, logger });
      await waitUntilTaskCompleted({ taskId, taskManager, timeout: 10 * 60 * 1000 });

      return res.ok<UninstallResponse>({
        body: {
          success: true,
        },
      });
    }
  );
};

const getOverallStatus = (statuses: InstallationStatus[]): InstallationStatus => {
  for (const status of statusOrder) {
    if (statuses.includes(status)) {
      return status;
    }
  }
  return 'installed';
};

const statusOrder: InstallationStatus[] = ['error', 'installing', 'uninstalled', 'installed'];
