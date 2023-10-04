/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { merge } from 'lodash';

import { packageToPackagePolicy } from '../../../../common/services/package_to_package_policy';
import { getInputsWithStreamIds, _compilePackagePolicyInputs } from '../../package_policy';

import type {
  PackageInfo,
  NewPackagePolicy,
  PackagePolicyInput,
  FullAgentPolicyInput,
  FullAgentPolicyInputStream,
} from '../../../../common/types';

import { getPackageInfo } from '.';

export const templatePackagePolicyToFullInputs = (
  packagePolicyInputs: PackagePolicyInput[]
): FullAgentPolicyInput[] => {
  const fullInputs: FullAgentPolicyInput[] = [];

  if (!packagePolicyInputs || packagePolicyInputs.length === 0) return fullInputs;

  packagePolicyInputs.forEach((input) => {
    const fullInput = {
      ...(input.compiled_input || {}),
      ...(input.streams.length
        ? {
            streams: input.streams
              .filter((stream) => stream.enabled)
              .map((stream) => {
                const fullStream: FullAgentPolicyInputStream = {
                  id: stream.id,
                  data_stream: stream.data_stream,
                  ...stream.compiled_stream,
                  ...Object.entries(stream.config || {}).reduce((acc, [key, { value }]) => {
                    acc[key] = value;
                    return acc;
                  }, {} as { [k: string]: any }),
                };
                return fullStream;
              }),
          }
        : {}),
    };

    // deeply merge the input.config values with the full policy input
    merge(
      fullInput,
      Object.entries(input.config || {}).reduce((acc, [key, { value }]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, unknown>)
    );
    fullInputs.push(fullInput);
  });

  return fullInputs;
};

export async function getInputs(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string
) {
  const packageInfoMap = new Map<string, PackageInfo>();
  let packageInfo: PackageInfo;

  if (packageInfoMap.has(pkgName)) {
    packageInfo = packageInfoMap.get(pkgName)!;
  } else {
    packageInfo = await getPackageInfo({
      savedObjectsClient: soClient,
      pkgName,
      pkgVersion,
    });
  }
  // ensureInstalledPackage ?
  const emptyPackagePolicy = packageToPackagePolicy(packageInfo, '');
  const inputsWithStreamIds = getInputsWithStreamIds(emptyPackagePolicy, undefined, true);

  const compiledInputs = await _compilePackagePolicyInputs(
    packageInfo,
    emptyPackagePolicy.vars || {},
    inputsWithStreamIds
  );

  const packagePolicyWithInputs: NewPackagePolicy = {
    ...emptyPackagePolicy,
    inputs: compiledInputs,
  };
  // TO FIX: ids are missing in streams
  const fullAgentPolicyInputs = templatePackagePolicyToFullInputs(packagePolicyWithInputs.inputs);
  const inputs = fullAgentPolicyInputs.flatMap((input) => input.streams);

  return { inputs };
}
