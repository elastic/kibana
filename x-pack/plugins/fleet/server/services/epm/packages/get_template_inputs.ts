/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { merge } from 'lodash';
import { safeDump } from 'js-yaml';

import { packageToPackagePolicy } from '../../../../common/services/package_to_package_policy';
import { getInputsWithStreamIds, _compilePackagePolicyInputs } from '../../package_policy';
import { appContextService } from '../../app_context';
import type {
  PackageInfo,
  NewPackagePolicy,
  PackagePolicyInput,
  FullAgentPolicyInput,
  FullAgentPolicyInputStream,
} from '../../../../common/types';
import { _sortYamlKeys } from '../../../../common/services/full_agent_policy_to_yaml';

import { getPackageInfo } from '.';
import { getPackageAssetsMap } from './get';

type Format = 'yml' | 'json';

// Function based off storedPackagePolicyToAgentInputs, it only creates the `streams` section instead of the FullAgentPolicyInput
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
            streams: input.streams.map((stream) => {
              const fullStream: FullAgentPolicyInputStream = {
                id: stream.id,
                type: input.type,
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

export async function getTemplateInputs(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string,
  format: Format,
  prerelease?: boolean
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
      prerelease,
    });
  }
  const emptyPackagePolicy = packageToPackagePolicy(packageInfo, '');
  const inputsWithStreamIds = getInputsWithStreamIds(emptyPackagePolicy, undefined, true);
  const assetsMap = await getPackageAssetsMap({
    logger: appContextService.getLogger(),
    packageInfo,
    savedObjectsClient: soClient,
  });
  const compiledInputs = await _compilePackagePolicyInputs(
    packageInfo,
    emptyPackagePolicy.vars || {},
    inputsWithStreamIds,
    assetsMap
  );
  const packagePolicyWithInputs: NewPackagePolicy = {
    ...emptyPackagePolicy,
    inputs: compiledInputs,
  };
  const fullAgentPolicyInputs = templatePackagePolicyToFullInputs(
    packagePolicyWithInputs.inputs as PackagePolicyInput[]
  );
  // @ts-ignore-next-line The return type is any because in some case we can have compiled_input instead of input.streams
  // we don't know what it is. An example is integration APM
  const inputs: any = fullAgentPolicyInputs.flatMap((input) => input?.streams || input);

  if (format === 'json') {
    return { inputs };
  } else if (format === 'yml') {
    const yaml = safeDump(
      { inputs },
      {
        skipInvalid: true,
        sortKeys: _sortYamlKeys,
      }
    );
    return yaml;
  }
  return { inputs: [] };
}
