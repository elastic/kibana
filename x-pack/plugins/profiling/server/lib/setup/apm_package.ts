/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installPackage, getInstallation } from '@kbn/fleet-plugin/server/services/epm/packages';
import {
  fetchFindLatestPackageOrThrow,
  pkgToPkgKey,
} from '@kbn/fleet-plugin/server/services/epm/registry';
import { ProfilingSetupOptions } from './types';
import { PartialSetupState } from '../../../common/setup';

export async function isApmPackageInstalled({
  soClient,
}: ProfilingSetupOptions): Promise<PartialSetupState> {
  const installation = await getInstallation({
    pkgName: 'apm',
    savedObjectsClient: soClient,
  });
  return {
    packages: {
      installed: !!installation,
    },
  };
}

export async function installLatestApmPackage({
  client,
  soClient,
  spaceId,
}: ProfilingSetupOptions) {
  const esClient = client.getEsClient();
  const { name, version } = await fetchFindLatestPackageOrThrow('apm');

  await installPackage({
    installSource: 'registry',
    esClient,
    savedObjectsClient: soClient,
    pkgkey: pkgToPkgKey({ name, version }),
    spaceId,
    force: true,
  });
}
