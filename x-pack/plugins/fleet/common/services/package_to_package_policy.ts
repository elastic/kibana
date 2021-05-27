/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PackageInfo,
  RegistryPolicyTemplate,
  RegistryVarsEntry,
  RegistryStream,
  PackagePolicyConfigRecord,
  NewPackagePolicyInput,
  NewPackagePolicyInputStream,
  NewPackagePolicy,
  PackagePolicyConfigRecordEntry,
} from '../types';

const getStreamsForInputType = (
  inputType: string,
  packageInfo: PackageInfo
): Array<RegistryStream & { data_stream: { type: string; dataset: string } }> => {
  const streams: Array<RegistryStream & { data_stream: { type: string; dataset: string } }> = [];

  (packageInfo.data_streams || []).forEach((dataStream) => {
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

  // Assume package will only ever ship one package policy template for now
  const packagePolicyTemplate: RegistryPolicyTemplate | null =
    packageInfo.policy_templates && packageInfo.policy_templates[0]
      ? packageInfo.policy_templates[0]
      : null;

  // Create package policy input property
  if (packagePolicyTemplate?.inputs?.length) {
    // Map each package package policy input to agent policy package policy input
    packagePolicyTemplate.inputs.forEach((packageInput) => {
      // Map each package input stream into package policy input stream
      const streams: NewPackagePolicyInputStream[] = getStreamsForInputType(
        packageInput.type,
        packageInfo
      ).map((packageStream) => {
        const stream: NewPackagePolicyInputStream = {
          enabled: packageStream.enabled === false ? false : true,
          data_stream: packageStream.data_stream,
        };
        if (packageStream.vars && packageStream.vars.length) {
          stream.vars = packageStream.vars.reduce(varsReducer, {});
        }
        return stream;
      });

      const input: NewPackagePolicyInput = {
        type: packageInput.type,
        enabled: streams.length ? !!streams.find((stream) => stream.enabled) : true,
        streams,
      };

      if (packageInput.vars && packageInput.vars.length) {
        input.vars = packageInput.vars.reduce(varsReducer, {});
      }

      inputs.push(input);
    });
  }

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
  };

  if (packageInfo.vars?.length) {
    packagePolicy.vars = packageInfo.vars.reduce(varsReducer, {});
  }

  return packagePolicy;
};
