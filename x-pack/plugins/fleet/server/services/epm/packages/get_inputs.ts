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
  PackagePolicy,
  FullAgentPolicyInput,
  FullAgentPolicyInputStream,
} from '../../../../common/types';

import { isPackageLimited } from '../../../../common/services';
import { DEFAULT_OUTPUT } from '../../../constants';

import { getPackageInfo } from '.';

const isPolicyEnabled = (packagePolicy: PackagePolicy) => {
  return packagePolicy.enabled && packagePolicy.inputs && packagePolicy.inputs.length;
};

export const templatePackagePolicyToFullInputs = (
  packagePolicy: PackagePolicy,
  packageInfo?: PackageInfo,
  outputId: string = DEFAULT_OUTPUT.name
): FullAgentPolicyInput[] => {
  const fullInputs: FullAgentPolicyInput[] = [];

  if (!isPolicyEnabled(packagePolicy)) {
    return fullInputs;
  }

  // Marks to skip appending input information to package policy ID to make it unique if package is "limited":
  // this means that only one policy for the package can exist on the agent policy, so its ID is already unique
  const appendInputId = packageInfo && isPackageLimited(packageInfo) ? false : true;

  packagePolicy.inputs.forEach((input) => {
    if (!input.enabled) {
      return;
    }

    const inputId = appendInputId
      ? `${input.type}${input.policy_template ? `-${input.policy_template}-` : '-'}${
          packagePolicy.id
        }`
      : packagePolicy.id;

    const fullInput: FullAgentPolicyInput = {
      id: inputId,
      name: packagePolicy.name,
      type: input.type,
      data_stream: {
        namespace: packagePolicy.namespace || 'default',
      },
      use_output: outputId,
      package_policy_id: packagePolicy.id,
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
  const id = 'PACKAGE_POLICY_ID';
  const emptyPackagePolicy = packageToPackagePolicy(packageInfo, id);
  const inputs = getInputsWithStreamIds(emptyPackagePolicy, undefined, true);

  const compiledInputs = await _compilePackagePolicyInputs(
    packageInfo,
    emptyPackagePolicy.vars || {},
    inputs
  );

  const packagePolicyWithInputs: NewPackagePolicy = {
    ...emptyPackagePolicy,
    inputs: compiledInputs,
  };

  const tempPackagePolicy = {
    ...packagePolicyWithInputs,
    id,
    revision: 0,
    updated_at: '',
    updated_by: '',
    created_at: '',
    created_by: '',
  } as PackagePolicy;
  const fullInputs = templatePackagePolicyToFullInputs(tempPackagePolicy, packageInfo, 'OUTPUT_ID');

  return { inputs: fullInputs };
}
