/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackageConfig, FullAgentConfigInput, FullAgentConfigInputStream } from '../types';
import { DEFAULT_OUTPUT } from '../constants';

export const storedPackageConfigsToAgentInputs = (
  packageConfigs: PackageConfig[]
): FullAgentConfigInput[] => {
  const fullInputs: FullAgentConfigInput[] = [];

  packageConfigs.forEach((packageConfig) => {
    if (!packageConfig.enabled || !packageConfig.inputs || !packageConfig.inputs.length) {
      return;
    }
    packageConfig.inputs.forEach((input) => {
      if (!input.enabled) {
        return;
      }

      const fullInput: FullAgentConfigInput = {
        id: packageConfig.id || packageConfig.name,
        name: packageConfig.name,
        type: input.type,
        dataset: {
          namespace: packageConfig.namespace || 'default',
        },
        use_output: DEFAULT_OUTPUT.name,
        ...Object.entries(input.config || {}).reduce((acc, [key, { value }]) => {
          acc[key] = value;
          return acc;
        }, {} as { [k: string]: any }),
        streams: input.streams
          .filter((stream) => stream.enabled)
          .map((stream) => {
            const fullStream: FullAgentConfigInputStream = {
              id: stream.id,
              dataset: stream.dataset,
              ...stream.compiled_stream,
              ...Object.entries(stream.config || {}).reduce((acc, [key, { value }]) => {
                acc[key] = value;
                return acc;
              }, {} as { [k: string]: any }),
            };
            return fullStream;
          }),
      };

      if (packageConfig.package) {
        fullInput.meta = {
          package: {
            name: packageConfig.package.name,
            version: packageConfig.package.version,
          },
        };
      }

      fullInputs.push(fullInput);
    });
  });

  return fullInputs;
};
