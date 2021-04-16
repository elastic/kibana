/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from 'kibana/server';

import type { FullAgentPolicyOutputPermissions } from '../../common';
import { getPackageInfo } from '../../server/services/epm/packages';

import type { PackagePolicy, RegistryDataStream } from '../types';

export const DEFAULT_PERMISSIONS = {
  cluster: ['monitor'],
  indices: [
    {
      names: [
        'logs-*',
        'metrics-*',
        'traces-*',
        'synthetics-*',
        '.logs-endpoint.diagnostic.collection-*',
      ],
      privileges: ['auto_configure', 'create_doc'],
    },
  ],
};

export async function storedPackagePoliciesToAgentPermissions(
  soClient: SavedObjectsClientContract,
  packagePolicies: string[] | PackagePolicy[]
): Promise<FullAgentPolicyOutputPermissions | undefined> {
  if (packagePolicies.length === 0) {
    return;
  }

  // I'm not sure what permissions to return for this case, so let's return the defaults
  if (typeof packagePolicies[0] === 'string') {
    return { _fallback: DEFAULT_PERMISSIONS };
  }

  const permissionEntries = (packagePolicies as PackagePolicy[]).map<Promise<[string, any]>>(
    async (packagePolicy) => {
      if (!packagePolicy.package) {
        return [packagePolicy.name, DEFAULT_PERMISSIONS];
      }

      const pkg = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: packagePolicy.package.name,
        pkgVersion: packagePolicy.package.version,
      });

      if (!pkg.data_streams) {
        return [packagePolicy.name, DEFAULT_PERMISSIONS];
      }

      const inputs = packagePolicy.inputs.filter((i) => i.enabled);

      // The input has a `type`, which corresponds with pkg.data_streams[].streams.type.
      // We want to get the corresponding data_stream for each input
      const dataStreams = inputs.flatMap((input) =>
        pkg.data_streams!.filter((ds) => ds.streams?.some((s) => s.input === input.type))
      );

      return [
        packagePolicy.name,
        { indices: dataStreams.map((ds) => getDataStreamPermissions(ds, packagePolicy.namespace)) },
      ];
    }
  );

  return Object.fromEntries(await Promise.all(permissionEntries));
}

export function getDataStreamPermissions(dataStream: RegistryDataStream, namespace: string = '*') {
  let index = `${dataStream.type}-${dataStream.dataset}-${namespace}`;

  if (dataStream.dataset_is_prefix) {
    index = `${index}-*`;
  }

  if (dataStream.hidden) {
    index = `.${index}`;
  }

  return {
    names: [index],
    privileges: dataStream.permissions?.indices || ['auto_configure', 'create_doc'],
  };
}
