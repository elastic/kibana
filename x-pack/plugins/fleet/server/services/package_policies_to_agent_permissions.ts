/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from 'kibana/server';

import type { FullAgentPolicyOutputPermissions, RegistryDataStreamPermissions } from '../../common';
import { getPackageInfo } from '../../server/services/epm/packages';

import type { PackagePolicy } from '../types';

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

      if (!pkg.data_streams || pkg.data_streams.length === 0) {
        return [packagePolicy.name, undefined];
      }

      let dataStreamsForPermissions: DataStreamMeta[];

      switch (pkg.name) {
        case 'endpoint':
          // - Endpoint doesn't store the `data_stream` metadata in
          // `packagePolicy.inputs`, so we will use _all_ data_streams from the
          // package.
          dataStreamsForPermissions = pkg.data_streams;
          break;

        case 'apm':
          // - APM doesn't store the `data_stream` metadata in
          //   `packagePolicy.inputs`, so we will use _all_ data_streams from
          //   the package.
          dataStreamsForPermissions = pkg.data_streams;
          break;

        default:
          // - Normal packages store some of the `data_stream` metadata in
          //   `packagePolicy.inputs[].streams[].data_stream`
          // - The rest of the metadata needs to be fetched from the
          //   `data_stream` object in the package. The link is
          //   `packagePolicy.inputs[].type == pkg.data_streams.streams[].input`
          // - Some packages (custom logs) have a compiled dataset, stored in
          //   `input.streams.compiled_stream.data_stream.dataset`
          dataStreamsForPermissions = packagePolicy.inputs
            .filter((i) => i.enabled)
            .flatMap((input) => {
              if (!input.streams) {
                return [];
              }

              const dataStreams_: DataStreamMeta[] = [];

              input.streams
                .filter((s) => s.enabled)
                .forEach((stream) => {
                  if (!('data_stream' in stream)) {
                    return;
                  }

                  const ds = {
                    type: stream.data_stream.type,
                    dataset:
                      stream.compiled_stream?.data_stream?.dataset ?? stream.data_stream.dataset,
                  };

                  dataStreams_.push(ds);
                });

              return dataStreams_;
            });
      }

      return [
        packagePolicy.name,
        {
          indices: dataStreamsForPermissions.map((ds) =>
            getDataStreamPermissions(ds, packagePolicy.namespace)
          ),
        },
      ];
    }
  );

  return Object.fromEntries(await Promise.all(permissionEntries));
}

interface DataStreamMeta {
  type: string;
  dataset: string;
  dataset_is_prefix?: boolean;
  hidden?: boolean;
  permissions?: RegistryDataStreamPermissions;
}

export function getDataStreamPermissions(dataStream: DataStreamMeta, namespace: string = '*') {
  let index = `${dataStream.type}-${dataStream.dataset}`;

  if (dataStream.dataset_is_prefix) {
    index = `${index}.*`;
  }

  if (dataStream.hidden) {
    index = `.${index}`;
  }

  index += `-${namespace}`;

  return {
    names: [index],
    privileges: dataStream.permissions?.indices || ['auto_configure', 'create_doc'],
  };
}
