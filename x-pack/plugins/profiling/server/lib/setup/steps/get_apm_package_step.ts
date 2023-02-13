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
import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';

export function getApmPackageStep({
  client,
  soClient,
  spaceId,
}: ProfilingSetupStepFactoryOptions): ProfilingSetupStep {
  const esClient = client.getEsClient();
  return {
    name: 'apm_package',
    hasCompleted: async () => {
      const installation = await getInstallation({
        pkgName: 'apm',
        savedObjectsClient: soClient,
      });

      return !!installation;
    },
    init: async () => {
      const { name, version } = await fetchFindLatestPackageOrThrow('apm');

      await installPackage({
        installSource: 'registry',
        esClient,
        savedObjectsClient: soClient,
        pkgkey: pkgToPkgKey({ name, version }),
        spaceId,
        force: true,
      });
    },
  };
}
