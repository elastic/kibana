/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PackageInfo,
  RegistryVarsEntry,
  RegistryStream,
  PackagePolicyConfigRecord,
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  NewPackagePolicy,
  PackagePolicyConfigRecordEntry,
} from '../types';

import { groupInputs } from './';

export const findDataStreamsByNames = (
  names: string[] = [],
  dataStreams: PackageInfo['data_streams'] = []
): PackageInfo['data_streams'] => {
  return names.length
    ? dataStreams.filter((dataStream) => names.includes(dataStream.path))
    : dataStreams;
};

export const getStreamsForInputType = (
  inputType: string,
  dataStreams: PackageInfo['data_streams'] = []
): Array<RegistryStream & Pick<NewPackagePolicyInputStream, 'data_stream'>> => {
  const streams: Array<RegistryStream & Pick<NewPackagePolicyInputStream, 'data_stream'>> = [];

  dataStreams.forEach((dataStream) => {
    (dataStream.streams || []).forEach((stream) => {
      if (stream.input === inputType) {
        streams.push({
          ...stream,
          data_stream: {
            type: dataStream.type,
            dataset: dataStream.dataset,
          },
        });
      }
    });
  });

  return streams;
};

// Reduces registry var def into config object entry
const varsReducer = (
  configObject: PackagePolicyConfigRecord,
  registryVar: RegistryVarsEntry
): PackagePolicyConfigRecord => {
  const configEntry: PackagePolicyConfigRecordEntry = {
    value: !registryVar.default && registryVar.multi ? [] : registryVar.default,
  };
  if (registryVar.type) {
    configEntry.type = registryVar.type;
  }
  configObject![registryVar.name] = configEntry;
  return configObject;
};

/*
 * This service creates a package policy inputs definition from defaults provided in package info
 */
export const packageToPackagePolicyInputs = (
  packageInfo: PackageInfo
): NewPackagePolicy['inputs'] => {
  const inputs: NewPackagePolicy['inputs'] = [];
  const packageInputGroups = groupInputs(packageInfo);

  packageInputGroups.forEach((inputGroup) => {
    const streams: NewPackagePolicyInputStream[] = (inputGroup.streams || []).map(
      (packageStream) => {
        const stream: NewPackagePolicyInputStream = {
          enabled: packageStream.enabled === false ? false : true,
          data_stream: packageStream.data_stream,
        };
        if (packageStream.vars && packageStream.vars.length) {
          stream.vars = packageStream.vars.reduce(varsReducer, {});
        }
        return stream;
      }
    );

    const input: NewPackagePolicyInput = {
      type: inputGroup.name,
      enabled: streams.length ? !!streams.find((stream) => stream.enabled) : true,
      streams,
    };

    if (inputGroup.vars && inputGroup.vars.length) {
      input.vars = inputGroup.vars.reduce(varsReducer, {});
    }

    inputs.push(input);
  });

  return inputs;
};

/**
 * Builds a `NewPackagePolicy` structure based on a package
 *
 * @param packageInfo
 * @param agentPolicyId
 * @param outputId
 * @param packagePolicyName
 */
export const packageToPackagePolicy = (options: {
  name?: string;
  description?: string;
  namespace?: string;
  packageInfo: PackageInfo;
  agentPolicyId: string;
  outputId: string;
}): NewPackagePolicy => {
  const {
    name,
    packageInfo,
    agentPolicyId,
    outputId,
    namespace = 'default',
    description,
  } = options;

  const packagePolicy: NewPackagePolicy = {
    name: name || `${packageInfo.name}-1`,
    namespace,
    description,
    package: {
      name: packageInfo.name,
      title: packageInfo.title,
      version: packageInfo.version,
    },
    enabled: true,
    policy_id: agentPolicyId,
    output_id: outputId,
    inputs: packageToPackagePolicyInputs(packageInfo),
  };

  if (packageInfo.vars?.length) {
    packagePolicy.vars = packageInfo.vars.reduce(varsReducer, {});
  }

  return packagePolicy;
};
