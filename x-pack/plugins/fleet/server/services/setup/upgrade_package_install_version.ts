/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import pMap from 'p-map';
import type { Logger } from '@kbn/logging';

import { PACKAGES_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../constants';
import { FLEET_INSTALL_FORMAT_VERSION } from '../../constants/fleet_es_assets';
import type { Installation } from '../../types';

import { reinstallPackageForInstallation } from '../epm/packages';

function findOutdatedInstallations(soClient: SavedObjectsClientContract) {
  return soClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:installed and (${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_format_schema_version < ${FLEET_INSTALL_FORMAT_VERSION} or not ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_format_schema_version:*)`,
  });
}
/**
 * Upgrade package install version for packages installed with an older version of Kibana
 */
export async function upgradePackageInstallVersion({
  soClient,
  esClient,
  logger,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  logger: Logger;
}) {
  const res = await findOutdatedInstallations(soClient);
  if (res.total === 0) {
    return;
  }

  await pMap(
    res.saved_objects,
    ({ attributes: installation }) => {
      // Uploaded package cannot be reinstalled
      return reinstallPackageForInstallation({
        soClient,
        esClient,
        installation,
      }).catch((err: Error) => {
        if (installation.install_source === 'upload') {
          logger.warn(
            `Uploaded package needs to be manually reinstalled ${installation.name}. ${err.message}`
          );
        } else {
          logger.error(
            `Package needs to be manually reinstalled ${installation.name} updating install_version failed. ${err.message}`
          );
        }
      });
    },
    { concurrency: 10 }
  );
}
