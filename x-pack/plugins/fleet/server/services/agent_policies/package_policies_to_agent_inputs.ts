/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from 'kibana/server';
import { merge } from 'lodash';

import { isPackageLimited } from '../../../common';
import type { PackagePolicy, FullAgentPolicyInput, FullAgentPolicyInputStream } from '../../types';
import { DEFAULT_OUTPUT } from '../../constants';

import { getPackageInfo } from '../epm/packages';

export const storedPackagePoliciesToAgentInputs = async (
  soClient: SavedObjectsClientContract,
  packagePolicies: PackagePolicy[],
  outputId: string = DEFAULT_OUTPUT.name
): Promise<FullAgentPolicyInput[]> => {
  const fullInputs: FullAgentPolicyInput[] = [];

  for(const packagePolicy of packagePolicies) {
    if (!packagePolicy.enabled || !packagePolicy.inputs || !packagePolicy.inputs.length) {
      continue;
    }

    let appendInputId = true;
  
    // Looks up package info and marks to skip appending input information to package policy ID
    // to make it unique if package is "limited": this means that only one policy for the package can
    // exist on the agent policy, so its ID is already unique
    if (packagePolicy.package) {
      const packageInfo = await getPackageInfo({
        savedObjectsClient: soClient,
        pkgName: packagePolicy.package.name,
        pkgVersion: packagePolicy.package.version,
      });
      if(isPackageLimited(packageInfo)) {
        appendInputId = false;
      }
    }

    packagePolicy.inputs.forEach((input) => {
      if (!input.enabled) {
        return;
      }

      const inputId = appendInputId ? `${input.type}${input.policy_template ? `-${input.policy_template}-` : '-'}${
          packagePolicy.id
        }` : packagePolicy.id;

      const fullInput: FullAgentPolicyInput = {
        id: inputId,
        revision: packagePolicy.revision,
        name: packagePolicy.name,
        type: input.type,
        data_stream: {
          namespace: packagePolicy.namespace || 'default',
        },
        use_output: outputId,
        ...(input.compiled_input || {}),
        ...(input.streams.length
          ? {
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
            }
          : {}),
      };

      // deeply merge the input.config values with the full policy input
      merge(
        fullInput,
        Object.entries(input.config || {}).reduce(
          (acc, [key, { value }]) => ({ ...acc, [key]: value }),
          {}
        )
      );

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
  };

  return fullInputs;
};
