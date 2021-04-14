/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'src/core/server';

import type { PackagePermissions } from '../../../../common/types';

import { getPackageInfo } from './get';

export async function getPackagePermissions(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string,
  namespace = '*'
): Promise<PackagePermissions | undefined> {
  const pkg = await getPackageInfo({ savedObjectsClient: soClient, pkgName, pkgVersion });
  if (!pkg.data_streams) {
    return undefined;
  }

  const clusterPermissions = new Set<string>();
  const indices: PackagePermissions['indices'] = pkg.data_streams!.map((ds) => {
    if (ds.permissions?.cluster) {
      ds.permissions.cluster.forEach((p) => clusterPermissions.add(p));
    }

    let index = `${ds.type}-${ds.dataset}-${namespace}`;
    if (ds.dataset_is_prefix) {
      index = `${index}-*`;
    }
    if (ds.hidden) {
      index = `.${index}`;
    }

    return {
      names: [index],
      privileges: ds.permissions?.indices ?? ['auto_configure', 'create_doc'],
    };
  });

  return {
    cluster: clusterPermissions.size > 0 ? Array.from(clusterPermissions) : undefined,
    indices,
  };
}
