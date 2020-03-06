/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageInfo, Datasource } from '../types';

/*
 * This service creates a datasource inputs definition from defaults provided in package info
 */
export const packageToConfigDatasourceInputs = (packageInfo: PackageInfo): Datasource['inputs'] => {
  const inputs: Datasource['inputs'] = [];

  // Assume package will only ever ship one datasource for now
  const packageDatasource =
    packageInfo.datasources && packageInfo.datasources[0] ? packageInfo.datasources[0] : [];

  // Create datasource input property
  if (packageDatasource.inputs && packageDatasource.inputs.length) {
    // Map each package datasource input to agent config datasource input
    packageDatasource.inputs.forEach((packageInput: any) => {
      const input = {
        type: packageInput.type,
        enabled: true,
        // Map each package input stream into datasource input stream
        streams: packageInput.streams
          ? packageInput.streams.map((packageStream: any) => {
              // Copy input vars into each stream's vars
              const streamVars = [...(packageInput.vars || []), ...(packageStream.vars || [])];
              const streamConfig = {};
              const streamVarsReducer = (configObject: any, streamVar: any): any => {
                configObject[streamVar.name] = streamVar.default;
                return configObject;
              };
              return {
                id: `${packageInput.type}-${packageStream.dataset}`,
                enabled: true,
                dataset: packageStream.dataset,
                config: streamVars.reduce(streamVarsReducer, streamConfig),
              };
            })
          : [],
      };

      inputs.push(input);
    });
  }

  return inputs;
};
