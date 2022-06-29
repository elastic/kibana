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

import { reinstallPackageFromInstallation } from '../epm/packages';

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
  const res = await soClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    perPage: SO_SEARCH_LIMIT,
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_status:installed and (${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_format_schema_version < ${FLEET_INSTALL_FORMAT_VERSION} or not ${PACKAGES_SAVED_OBJECT_TYPE}.attributes.install_format_schema_version:*)`,
  });

  if (res.total === 0) {
    return;
  }

  await pMap(
    res.saved_objects,
    ({ attributes: installation }) => {
      if (installation.install_source === 'upload') {
        return;
      }
      return reinstallPackageFromInstallation({
        soClient,
        esClient,
        installation,
      }).catch((err) => {
        logger.error(
          `Package needs to be manually reinstalled ${installation.name} updating install_version failed.`
        );
      });
    },
    { concurrency: 10 }
  );
}
