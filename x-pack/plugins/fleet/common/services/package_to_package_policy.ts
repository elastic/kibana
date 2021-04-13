/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PackageInfo,
  RegistryVarsEntry,
  RegistryInput,
  RegistryStream,
  PackagePolicyConfigRecord,
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  NewPackagePolicy,
  PackagePolicyConfigRecordEntry,
} from '../types';

import { doesPackageHaveIntegrations } from './';

const getStreamsForInputType = (
  inputType: string,
  packageInfo: PackageInfo,
  dataStreamPaths: string[] = []
): Array<RegistryStream & { data_stream: { type: string; dataset: string } }> => {
  const streams: Array<RegistryStream & { data_stream: { type: string; dataset: string } }> = [];
  const dataStreams = packageInfo.data_streams || [];
  const dataStreamsToSearch = dataStreamPaths.length
    ? dataStreams.filter((dataStream) => dataStreamPaths.includes(dataStream.path))
    : dataStreams;

  dataStreamsToSearch.forEach((dataStream) => {
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
export const packageToPackagePolicyInputs = (packageInfo: PackageInfo): NewPackagePolicyInput[] => {
  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);
  const inputs: NewPackagePolicyInput[] = [];
  const packageInputsByType: {
    [key: string]: Array<RegistryInput & { data_streams?: string[]; policy_template: string }>;
  } = {};

  packageInfo.policy_templates?.forEach((packagePolicyTemplate) => {
    packagePolicyTemplate.inputs?.forEach((packageInput) => {
      const input = {
        ...packageInput,
        ...(packagePolicyTemplate.data_streams
          ? { data_streams: packagePolicyTemplate.data_streams }
          : {}),
        policy_template: packagePolicyTemplate.name,
      };
      if (packageInputsByType[packageInput.type]) {
        packageInputsByType[packageInput.type].push(input);
      } else {
        packageInputsByType[packageInput.type] = [input];
      }
    });
  });

  Object.entries(packageInputsByType).forEach(([inputType, packageInputs]) => {
    const streamsForInputType: NewPackagePolicyInputStream[] = [];
    let varsForInputType: PackagePolicyConfigRecord = {};

    packageInputs.forEach((packageInput) => {
      // Map each package input stream into package policy input stream
      const streams = getStreamsForInputType(
        packageInput.type,
        packageInfo,
        packageInput.data_streams
      ).map((packageStream) => {
        const stream: NewPackagePolicyInputStream = {
          enabled: packageStream.enabled === false ? false : true,
          data_stream: {
            ...packageStream.data_stream,
            policy_template: packageInput.policy_template,
          },
        };
        if (packageStream.vars && packageStream.vars.length) {
          stream.vars = packageStream.vars.reduce(varsReducer, {});
        }
        return stream;
      });

      // If non-integration package, collect input-level vars, otherwise
      // copy them to each stream
      if (packageInput.vars?.length) {
        const inputVars = packageInput.vars.reduce(varsReducer, {});
        if (hasIntegrations) {
          streams.map((stream) => {
            stream.vars = {
              ...inputVars,
              ...(stream.vars || {}),
            };
          });
        } else {
          varsForInputType = inputVars;
        }
      }

      streamsForInputType.push(...streams);
    });

    const input: NewPackagePolicyInput = {
      type: inputType,
      enabled: streamsForInputType.length
        ? !!streamsForInputType.find((stream) => stream.enabled)
        : true,
      streams: streamsForInputType,
    };

    if (Object.keys(varsForInputType).length) {
      input.vars = varsForInputType;
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
export const packageToPackagePolicy = (
  packageInfo: PackageInfo,
  agentPolicyId: string,
  outputId: string,
  namespace: string = '',
  packagePolicyName?: string,
  description?: string
): NewPackagePolicy => {
  const packagePolicy: NewPackagePolicy = {
    name: packagePolicyName || `${packageInfo.name}-1`,
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
    vars: undefined,
  };

  if (packageInfo.vars?.length) {
    packagePolicy.vars = packageInfo.vars.reduce(varsReducer, {});
  }

  return packagePolicy;
};
