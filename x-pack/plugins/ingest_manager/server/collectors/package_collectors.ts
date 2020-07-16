/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'kibana/server';
import _ from 'lodash';
import { getPackageSavedObjects } from '../services/epm/packages/get';
import { agentConfigService } from '../services';
import { NewPackageConfig } from '../types';

export interface PackageUsage {
  name: string;
  version: string;
  enabled: boolean;
}

export const getPackageUsage = async (soClient?: SavedObjectsClient): Promise<PackageUsage[]> => {
  if (!soClient) {
    return [];
  }
  const packagesSavedObjects = await getPackageSavedObjects(soClient);
  const agentConfigs = await agentConfigService.list(soClient, {
    perPage: 1000, // avoiding pagination
    withPackageConfigs: true,
  });

  // Once we provide detailed telemetry on agent configs, this logic should probably be moved
  // to the (then to be created) agent config collector, so we only query and loop over these
  // objects once.

  const packagesInConfigs = agentConfigs.items.map((agentConfig) => {
    const packageConfigs: NewPackageConfig[] = agentConfig.package_configs as NewPackageConfig[];
    return packageConfigs
      .map((packageConfig) => packageConfig.package?.name)
      .filter((packageName): packageName is string => packageName !== undefined);
  });

  const enabledPackages = _.uniq(_.flatten(packagesInConfigs));

  return packagesSavedObjects.saved_objects.map((p) => {
    return {
      name: p.attributes.name,
      version: p.attributes.version,
      enabled: enabledPackages.includes(p.attributes.name),
    };
  });
};
