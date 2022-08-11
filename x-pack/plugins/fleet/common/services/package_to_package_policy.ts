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

import { doesPackageHaveIntegrations } from '.';

export const getStreamsForInputType = (
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
export const packageToPackagePolicyInputs = (
  packageInfo: PackageInfo,
  integrationToEnable?: string
): NewPackagePolicyInput[] => {
  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);
  const inputs: NewPackagePolicyInput[] = [];
  const packageInputsByPolicyTemplateAndType: {
    [key: string]: RegistryInput & { data_streams?: string[]; policy_template: string };
  } = {};

  packageInfo.policy_templates?.forEach((packagePolicyTemplate) => {
    packagePolicyTemplate.inputs?.forEach((packageInput) => {
      const inputKey = `${packagePolicyTemplate.name}-${packageInput.type}`;
      const input = {
        ...packageInput,
        ...(packagePolicyTemplate.data_streams
          ? { data_streams: packagePolicyTemplate.data_streams }
          : {}),
        policy_template: packagePolicyTemplate.name,
      };
      packageInputsByPolicyTemplateAndType[inputKey] = input;
    });
  });

  Object.values(packageInputsByPolicyTemplateAndType).forEach((packageInput) => {
    const streamsForInput: NewPackagePolicyInputStream[] = [];
    let varsForInput: PackagePolicyConfigRecord = {};

    // Map each package input stream into package policy input stream
    const streams = getStreamsForInputType(
      packageInput.type,
      packageInfo,
      packageInput.data_streams
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

    // If non-integration package, collect input-level vars, otherwise skip them,
    // we do not support input-level vars for packages with integrations yet)
    if (packageInput.vars?.length && !hasIntegrations) {
      varsForInput = packageInput.vars.reduce(varsReducer, {});
    }

    streamsForInput.push(...streams);

    // Check if we should enable this input by the streams below it
    // Enable it if at least one of its streams is enabled
    let enableInput = streamsForInput.length
      ? !!streamsForInput.find((stream) => stream.enabled)
      : true;

    // If we are wanting to enabling this input, check if we only want
    // to enable specific integrations (aka `policy_template`s)
    if (
      enableInput &&
      hasIntegrations &&
      integrationToEnable &&
      integrationToEnable !== packageInput.policy_template
    ) {
      enableInput = false;
    }

    const input: NewPackagePolicyInput = {
      type: packageInput.type,
      policy_template: packageInput.policy_template,
      enabled: enableInput,
      streams: streamsForInput,
    };

    if (Object.keys(varsForInput).length) {
      input.vars = varsForInput;
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
  description?: string,
  integrationToEnable?: string
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
    inputs: packageToPackagePolicyInputs(packageInfo, integrationToEnable),
    vars: undefined,
  };

  if (packageInfo.vars?.length) {
    packagePolicy.vars = packageInfo.vars.reduce(varsReducer, {});
  }

  return packagePolicy;
};
