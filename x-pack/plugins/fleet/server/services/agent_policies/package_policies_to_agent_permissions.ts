/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_UNIVERSAL_PROFILING_SYMBOLIZER_PACKAGE } from '../../../common/constants';

import { getNormalizedDataStreams } from '../../../common/services';

import type {
  FullAgentPolicyOutputPermissions,
  PackageInfo,
  RegistryDataStreamPrivileges,
} from '../../../common/types';
import { PACKAGE_POLICY_DEFAULT_INDEX_PRIVILEGES } from '../../constants';

import type { PackagePolicy } from '../../types';
import { pkgToPkgKey } from '../epm/registry';

export const DEFAULT_CLUSTER_PERMISSIONS = ['monitor'];

export const UNIVERSAL_PROFILING_PERMISSIONS = [
  'auto_configure',
  'read',
  'create_doc',
  'create',
  'write',
  'index',
  'view_index_metadata',
];

export async function storedPackagePoliciesToAgentPermissions(
  packageInfoCache: Map<string, PackageInfo>,
  packagePolicies?: PackagePolicy[]
): Promise<FullAgentPolicyOutputPermissions | undefined> {
  // I'm not sure what permissions to return for this case, so let's return the defaults
  if (!packagePolicies) {
    throw new Error(
      'storedPackagePoliciesToAgentPermissions should be called with a PackagePolicy'
    );
  }

  if (packagePolicies.length === 0) {
    return;
  }

  const permissionEntries = (packagePolicies as PackagePolicy[]).map<Promise<[string, any]>>(
    async (packagePolicy) => {
      if (!packagePolicy.package) {
        throw new Error(`No package for package policy ${packagePolicy.name ?? packagePolicy.id}`);
      }

      const pkg = packageInfoCache.get(pkgToPkgKey(packagePolicy.package))!;

      // Special handling for Universal Profiling packages, as it does not use data streams _only_,
      // but also indices that do not adhere to the convention.
      if (pkg.name === FLEET_UNIVERSAL_PROFILING_SYMBOLIZER_PACKAGE) {
        return Promise.resolve(universalProfilingPermissions(packagePolicy.id));
      }

      const dataStreams = getNormalizedDataStreams(pkg);
      if (!dataStreams || dataStreams.length === 0) {
        return [packagePolicy.name, undefined];
      }

      let dataStreamsForPermissions: DataStreamMeta[];

      switch (pkg.name) {
        case 'endpoint':
          // - Endpoint doesn't store the `data_stream` metadata in
          // `packagePolicy.inputs`, so we will use _all_ data_streams from the
          // package.
          dataStreamsForPermissions = dataStreams;
          break;

        case 'apm':
          // - APM doesn't store the `data_stream` metadata in
          //   `packagePolicy.inputs`, so we will use _all_ data_streams from
          //   the package.
          dataStreamsForPermissions = dataStreams;
          break;

        case 'osquery_manager':
          // - Osquery manager doesn't store the `data_stream` metadata in
          //   `packagePolicy.inputs`, so we will use _all_ data_streams from
          //   the package.
          dataStreamsForPermissions = dataStreams;
          break;

        default:
          // - Normal packages store some of the `data_stream` metadata in
          //   `packagePolicy.inputs[].streams[].data_stream`
          // - The rest of the metadata needs to be fetched from the
          //   `data_stream` object in the package. The link is
          //   `packagePolicy.inputs[].type == dataStreams.streams[].input`
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

                  const ds: DataStreamMeta = {
                    type: stream.data_stream.type,
                    dataset:
                      stream.compiled_stream?.data_stream?.dataset ?? stream.data_stream.dataset,
                  };

                  if (stream.data_stream.elasticsearch) {
                    ds.elasticsearch = stream.data_stream.elasticsearch;
                  }

                  dataStreams_.push(ds);
                });

              return dataStreams_;
            });
      }

      let clusterRoleDescriptor = {};
      const cluster = packagePolicy?.elasticsearch?.privileges?.cluster ?? [];
      if (cluster.length > 0) {
        clusterRoleDescriptor = {
          cluster,
        };
      }

      return [
        packagePolicy.id,
        {
          indices: dataStreamsForPermissions.map((ds) =>
            getDataStreamPrivileges(ds, packagePolicy.namespace)
          ),
          ...clusterRoleDescriptor,
        },
      ];
    }
  );

  return Object.fromEntries(await Promise.all(permissionEntries));
}

export interface DataStreamMeta {
  type: string;
  dataset: string;
  dataset_is_prefix?: boolean;
  hidden?: boolean;
  elasticsearch?: {
    privileges?: RegistryDataStreamPrivileges;
    dynamic_namespace?: boolean;
    dynamic_dataset?: boolean;
  };
}

export function getDataStreamPrivileges(dataStream: DataStreamMeta, namespace: string = '*') {
  let index = dataStream.hidden ? `.${dataStream.type}-` : `${dataStream.type}-`;

  // Determine dataset
  if (dataStream.elasticsearch?.dynamic_dataset) {
    index += `*`;
  } else if (dataStream.dataset_is_prefix) {
    index += `${dataStream.dataset}.*`;
  } else {
    index += dataStream.dataset;
  }

  // Determine namespace
  if (dataStream.elasticsearch?.dynamic_namespace) {
    index += `-*`;
  } else {
    index += `-${namespace}`;
  }

  const privileges = dataStream?.elasticsearch?.privileges?.indices?.length
    ? dataStream.elasticsearch.privileges.indices
    : PACKAGE_POLICY_DEFAULT_INDEX_PRIVILEGES;

  return {
    names: [index],
    privileges,
  };
}

async function universalProfilingPermissions(packagePolicyId: string): Promise<[string, any]> {
  const profilingIndexPattern = 'profiling-*';
  return [
    packagePolicyId,
    {
      indices: [
        {
          names: [profilingIndexPattern],
          privileges: UNIVERSAL_PROFILING_PERMISSIONS,
        },
      ],
    },
  ];
}
