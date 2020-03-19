/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  PackageInfo,
  RegistryDatasource,
  RegistryVarsEntry,
  Datasource,
  DatasourceConfigRecord,
  DatasourceInput,
  DatasourceInputStream,
  NewDatasource,
} from '../types';

/*
 * This service creates a datasource inputs definition from defaults provided in package info
 */
export const packageToConfigDatasourceInputs = (packageInfo: PackageInfo): Datasource['inputs'] => {
  const inputs: Datasource['inputs'] = [];

  // Assume package will only ever ship one datasource for now
  const packageDatasource: RegistryDatasource | null =
    packageInfo.datasources && packageInfo.datasources[0] ? packageInfo.datasources[0] : null;

  // Create datasource input property
  if (packageDatasource?.inputs?.length) {
    // Map each package datasource input to agent config datasource input
    packageDatasource.inputs.forEach(packageInput => {
      // Reduces registry var def into config object entry
      const varsReducer = (
        configObject: DatasourceConfigRecord,
        registryVar: RegistryVarsEntry
      ): DatasourceConfigRecord => {
        if (!registryVar.default && registryVar.multi) {
          configObject![registryVar.name] = { type: registryVar.type, value: [] };
        } else {
          configObject![registryVar.name] = { type: registryVar.type, value: registryVar.default };
        }
        return configObject;
      };

      // Map each package input stream into datasource input stream
      const streams: DatasourceInputStream[] = packageInput.streams
        ? packageInput.streams.map(packageStream => {
            return {
              id: `${packageInput.type}-${packageStream.dataset}`,
              enabled: packageStream.enabled === false ? false : true,
              dataset: packageStream.dataset,
              config: (packageStream.vars || []).reduce(varsReducer, {}),
            };
          })
        : [];

      const input: DatasourceInput = {
        type: packageInput.type,
        enabled: streams.length ? !!streams.find(stream => stream.enabled) : true,
        config: (packageInput.vars || []).reduce(varsReducer, {}),
        streams,
      };

      inputs.push(input);
    });
  }

  return inputs;
};

/**
 * Builds a `NewDatasource` structure based on a package
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
  datasourceName?: string
): NewDatasource => {
  return {
    name: datasourceName || `${packageInfo.name}-1`,
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
