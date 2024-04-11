/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../constants';

import { auditLoggingService } from '../../../../audit_logging';

import type { InstallContext } from '../_state_machine_package_install';
import { withPackageSpan } from '../../utils';

// Function invoked after each transition
export const updateLatestExecutedState = async (context: InstallContext) => {
  const { logger, savedObjectsClient, packageInstallContext, latestExecutedState } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName } = packageInfo;

  try {
    // if there is no error avoid updating the SO as the call adds ~1s to install time
    // also ddon't save it if the error is of type ConcurrentInstallationError
    if (
      !latestExecutedState?.error ||
      latestExecutedState?.error?.includes('Concurrent installation or upgrade')
    )
      return;

    auditLoggingService.writeCustomSoAuditLog({
      action: 'update',
      id: pkgName,
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });
    return await withPackageSpan('Update latest executed state', () =>
      savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
        latest_executed_state: latestExecutedState,
      })
    );
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(`Failed to update SO with latest executed state: ${err}`);
    }
  }
};
