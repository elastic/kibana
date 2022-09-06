/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common/constants';

import type { Installation } from '../../../types';
import { pkgToPkgKey } from '../registry';

import { installPackage } from './install';

export async function reinstallPackageForInstallation({
  soClient,
  esClient,
  installation,
}: {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  installation: Installation;
}) {
  if (installation.install_source === 'upload') {
    throw new Error('Cannot reinstall an uploaded package');
  }
  return installPackage({
    // If the package is bundled reinstall from the registry will still use the bundled package.
    installSource: 'registry',
    savedObjectsClient: soClient,
    pkgkey: pkgToPkgKey({
      name: installation.name,
      version: installation.version,
    }),
    esClient,
    spaceId: installation.installed_kibana_space_id || DEFAULT_SPACE_ID,
    // Force install the package will update the index template and the datastream write indices
    force: true,
  });
}
