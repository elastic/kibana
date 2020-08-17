/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PackagePolicy, FullAgentPolicyInput, FullAgentPolicyInputStream } from '../types';
import { DEFAULT_OUTPUT } from '../constants';

export const storedPackagePoliciesToAgentInputs = (
  packagePolicies: PackagePolicy[]
): FullAgentPolicyInput[] => {
  const fullInputs: FullAgentPolicyInput[] = [];

  packagePolicies.forEach((packagePolicy) => {
    if (!packagePolicy.enabled || !packagePolicy.inputs || !packagePolicy.inputs.length) {
      return;
    }
    packagePolicy.inputs.forEach((input) => {
      if (!input.enabled) {
        return;
      }

      const fullInput: FullAgentPolicyInput = {
        id: packagePolicy.id || packagePolicy.name,
        name: packagePolicy.name,
        type: input.type,
        data_stream: {
          namespace: packagePolicy.namespace || 'default',
        },
        use_output: DEFAULT_OUTPUT.name,
        ...Object.entries(input.config || {}).reduce((acc, [key, { value }]) => {
          acc[key] = value;
          return acc;
        }, {} as { [k: string]: any }),
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
      };

      if (packagePolicy.package) {
        fullInput.meta = {
          package: {
            name: packagePolicy.package.name,
            version: packagePolicy.package.version,
          },
        };
      }

      fullInputs.push(fullInput);
    });
  });

  return fullInputs;
};
