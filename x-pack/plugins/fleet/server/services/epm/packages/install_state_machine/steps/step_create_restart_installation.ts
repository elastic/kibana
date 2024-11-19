/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConcurrentInstallOperationError } from '../../../../../errors';
import { MAX_TIME_COMPLETE_INSTALL } from '../../../../../constants';

import { restartInstallation, createInstallation } from '../../install';

import type { InstallContext } from '../_state_machine_package_install';
import { withPackageSpan } from '../../utils';

export async function stepCreateRestartInstallation(context: InstallContext) {
  const {
    savedObjectsClient,
    logger,
    installSource,
    packageInstallContext,
    spaceId,
    force,
    verificationResult,
    installedPkg,
  } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName, version: pkgVersion } = packageInfo;

  // if some installation already exists
  if (installedPkg) {
    const isStatusInstalling = installedPkg.attributes.install_status === 'installing';
    const hasExceededTimeout =
      Date.now() - Date.parse(installedPkg.attributes.install_started_at) <
      MAX_TIME_COMPLETE_INSTALL;
    logger.debug(`Package install - Install status ${installedPkg.attributes.install_status}`);

    // if the installation is currently running, don't try to install
    // instead, only return already installed assets
    if (isStatusInstalling && hasExceededTimeout) {
      // If this is a forced installation, ignore the timeout and restart the installation anyway
      logger.debug(`Package install - Installation is running and has exceeded timeout`);

      if (force) {
        logger.debug(`Package install - Forced installation, restarting`);
        await withPackageSpan('Restarting installation with force flag', () =>
          restartInstallation({
            savedObjectsClient,
            pkgName,
            pkgVersion,
            installSource,
            verificationResult,
          })
        );
      } else {
        throw new ConcurrentInstallOperationError(
          `Concurrent installation or upgrade of ${pkgName || 'unknown'}-${
            pkgVersion || 'unknown'
          } detected, aborting.`
        );
      }
    } else {
      // if no installation is running, or the installation has been running longer than MAX_TIME_COMPLETE_INSTALL
      // (it might be stuck) update the saved object and proceed
      logger.debug(
        `Package install - no installation running or the installation has been running longer than ${MAX_TIME_COMPLETE_INSTALL}, restarting`
      );
      await withPackageSpan('Restarting installation', () =>
        restartInstallation({
          savedObjectsClient,
          pkgName,
          pkgVersion,
          installSource,
          verificationResult,
        })
      );
    }
  } else {
    logger.debug(`Package install - Create installation`);

    await withPackageSpan('Creating installation', () =>
      createInstallation({
        savedObjectsClient,
        packageInfo,
        installSource,
        spaceId,
        verificationResult,
      })
    );
  }
}
