/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { satisfies } from 'semver';
import { installPackage } from '@kbn/fleet-plugin/server/services/epm/packages';
import { pkgToPkgKey } from '@kbn/fleet-plugin/server/services/epm/registry';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';
import type { Installation } from '@kbn/fleet-plugin/common';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';

interface UpgradeIntegrationOptions {
  packageInfo?: Installation;
  client: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
}

// Conditionally upgrade osquery integration in order to fix 8.6.0 agent issue
export const upgradeIntegration = async ({
  packageInfo,
  client,
  esClient,
  logger,
}: UpgradeIntegrationOptions) => {

  if (packageInfo && satisfies(packageInfo?.version ?? '', '<1.6.0')) {
    try {
      logger.info('Updating osquery_manager integration');
      await installPackage({
        installSource: 'registry',
        savedObjectsClient: client,
        pkgkey: pkgToPkgKey({
          name: packageInfo.name,
          version: '1.6.0', // This package upgrade is specific to a bug fix, so keeping the upgrade focused on 1.6.0
        }),
        esClient,
        spaceId: packageInfo.installed_kibana_space_id || DEFAULT_SPACE_ID,
        // Force install the package will update the index template and the datastream write indices
        force: true,
      });
      logger.info('osquery_manager integration updated');
    } catch (e) {
      logger.error(e);
    }
  }
};
