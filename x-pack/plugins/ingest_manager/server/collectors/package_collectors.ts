/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'kibana/server';
import { getPackageSavedObjects } from '../services/epm/packages/get';

export interface PackageUsage {
  name: string;
  version: string;
}

export const getPackageUsage = async (soClient?: SavedObjectsClient): Promise<PackageUsage[]> => {
  if (!soClient) {
    return [];
  }
  const packagesSavedObjects = await getPackageSavedObjects(soClient);
  // console.log('packages is ', JSON.stringify(packagesSave, null, 2));
  return packagesSavedObjects.saved_objects.map((p) => {
    return {
      name: p.attributes.name,
      version: p.attributes.version,
    };
  });
};
