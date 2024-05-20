/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PACKAGES_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
  FLEET_INSTALL_FORMAT_VERSION,
} from '../../../../../constants';
import type { Installation } from '../../../../../types';

import { packagePolicyService } from '../../../..';

import { auditLoggingService } from '../../../../audit_logging';

import { withPackageSpan } from '../../utils';

import { clearLatestFailedAttempts } from '../../install_errors_helpers';

import type { InstallContext } from '../_state_machine_package_install';

export async function stepSaveSystemObject(context: InstallContext) {
  const {
    packageInstallContext,
    savedObjectsClient,
    logger,
    esClient,
    installedPkg,
    packageAssetRefs,
  } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName, version: pkgVersion } = packageInfo;

  auditLoggingService.writeCustomSoAuditLog({
    action: 'update',
    id: pkgName,
    savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
  });

  await withPackageSpan('Update install status', () =>
    savedObjectsClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
      version: pkgVersion,
      install_version: pkgVersion,
      install_status: 'installed',
      package_assets: packageAssetRefs,
      install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
      latest_install_failed_attempts: clearLatestFailedAttempts(
        pkgVersion,
        installedPkg?.attributes.latest_install_failed_attempts ?? []
      ),
    })
  );

  // Need to refetch the installation again to retrieve all the attributes
  const updatedPackage = await savedObjectsClient.get<Installation>(
    PACKAGES_SAVED_OBJECT_TYPE,
    pkgName
  );
  logger.debug(`Package install - Install status ${updatedPackage?.attributes?.install_status}`);
  // If the package is flagged with the `keep_policies_up_to_date` flag, upgrade its
  // associated package policies after installation
  if (updatedPackage.attributes.keep_policies_up_to_date) {
    await withPackageSpan('Upgrade package policies', async () => {
      const policyIdsToUpgrade = await packagePolicyService.listIds(savedObjectsClient, {
        page: 1,
        perPage: SO_SEARCH_LIMIT,
        kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
      });
      logger.debug(
        `Package install - Package is flagged with keep_policies_up_to_date, upgrading its associated package policies ${policyIdsToUpgrade}`
      );
      await packagePolicyService.upgrade(savedObjectsClient, esClient, policyIdsToUpgrade.items);
    });
  }
  logger.debug(
    `Install status ${updatedPackage?.attributes?.install_status} - Installation complete!`
  );
}
