/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  PackageInfo,
  RegistryConfigTemplate,
  RegistryVarsEntry,
  RegistryStream,
  PackageConfig,
  PackageConfigConfigRecord,
  PackageConfigConfigRecordEntry,
  PackageConfigInput,
  PackageConfigInputStream,
  NewPackageConfig,
} from '../types';

const getStreamsForInputType = (
  inputType: string,
  packageInfo: PackageInfo
): Array<RegistryStream & { dataset: { type: string; name: string } }> => {
  const streams: Array<RegistryStream & { dataset: { type: string; name: string } }> = [];

  (packageInfo.datasets || []).forEach((dataset) => {
    (dataset.streams || []).forEach((stream) => {
      if (stream.input === inputType) {
        streams.push({
          ...stream,
          dataset: {
            type: dataset.type,
            name: dataset.name,
          },
        });
      }
    });
  });

  return streams;
};

/*
 * This service creates a datasource inputs definition from defaults provided in package info
 */
export const packageToConfigDatasourceInputs = (
  packageInfo: PackageInfo
): PackageConfig['inputs'] => {
  const inputs: PackageConfig['inputs'] = [];

  // Assume package will only ever ship one datasource for now
  const packageDatasource: RegistryConfigTemplate | null =
    packageInfo.config_templates && packageInfo.config_templates[0]
      ? packageInfo.config_templates[0]
      : null;

  // Create datasource input property
  if (packageDatasource?.inputs?.length) {
    // Map each package datasource input to agent config datasource input
    packageDatasource.inputs.forEach((packageInput) => {
      // Reduces registry var def into config object entry
      const varsReducer = (
        configObject: PackageConfigConfigRecord,
        registryVar: RegistryVarsEntry
      ): PackageConfigConfigRecord => {
        const configEntry: PackageConfigConfigRecordEntry = {
          value: !registryVar.default && registryVar.multi ? [] : registryVar.default,
        };
        if (registryVar.type) {
          configEntry.type = registryVar.type;
        }
        configObject![registryVar.name] = configEntry;
        return configObject;
      };

      // Map each package input stream into datasource input stream
      const streams: PackageConfigInputStream[] = getStreamsForInputType(
        packageInput.type,
        packageInfo
      ).map((packageStream) => {
        const stream: PackageConfigInputStream = {
          id: `${packageInput.type}-${packageStream.dataset.name}`,
          enabled: packageStream.enabled === false ? false : true,
          dataset: {
            name: packageStream.dataset.name,
            type: packageStream.dataset.type,
          },
        };
        if (packageStream.vars && packageStream.vars.length) {
          stream.vars = packageStream.vars.reduce(varsReducer, {});
        }
        return stream;
      });

      const input: PackageConfigInput = {
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
 * Builds a `NewPackageConfig` structure based on a package
 *
 * @param packageInfo
 * @param configId
 * @param outputId
 * @param datasourceName
 */
export const packageToConfigDatasource = (
  packageInfo: PackageInfo,
  configId: string,
  outputId: string,
  namespace: string = '',
  datasourceName?: string,
  description?: string
): NewPackageConfig => {
  return {
    name: datasourceName || `${packageInfo.name}-1`,
    namespace,
    description,
    package: {
      name: packageInfo.name,
      title: packageInfo.title,
      version: packageInfo.version,
    },
    enabled: true,
    config_id: configId,
    output_id: outputId,
    inputs: packageToConfigDatasourceInputs(packageInfo),
  };
};
