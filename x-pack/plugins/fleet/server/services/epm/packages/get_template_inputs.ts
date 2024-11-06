/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsClientContract } from '@kbn/core/server';

import { merge } from 'lodash';
import { dump } from 'js-yaml';
import yamlDoc from 'yaml';

import { getNormalizedInputs, isIntegrationPolicyTemplate } from '../../../../common/services';

import {
  getStreamsForInputType,
  packageToPackagePolicy,
} from '../../../../common/services/package_to_package_policy';
import { getInputsWithStreamIds, _compilePackagePolicyInputs } from '../../package_policy';
import { appContextService } from '../../app_context';
import type {
  PackageInfo,
  NewPackagePolicy,
  PackagePolicyInput,
  TemplateAgentPolicyInput,
  RegistryVarsEntry,
  RegistryStream,
  RegistryInput,
} from '../../../../common/types';
import { _sortYamlKeys } from '../../../../common/services/full_agent_policy_to_yaml';

import { getFullInputStreams } from '../../agent_policies/package_policies_to_agent_inputs';

import { getPackageInfo } from '.';
import { getPackageAssetsMap } from './get';

type Format = 'yml' | 'json';

type PackageWithInputAndStreamIndexed = Record<
  string,
  RegistryInput & {
    streams: Record<
      string,
      RegistryStream & {
        data_stream: { type: string; dataset: string };
      }
    >;
  }
>;

// Function based off storedPackagePolicyToAgentInputs, it only creates the `streams` section instead of the FullAgentPolicyInput
export const templatePackagePolicyToFullInputStreams = (
  packagePolicyInputs: PackagePolicyInput[]
): TemplateAgentPolicyInput[] => {
  const fullInputsStreams: TemplateAgentPolicyInput[] = [];

  if (!packagePolicyInputs || packagePolicyInputs.length === 0) return fullInputsStreams;

  packagePolicyInputs.forEach((input) => {
    const fullInputStream = {
      // @ts-ignore-next-line the following id is actually one level above the one in fullInputStream, but the linter thinks it gets overwritten
      id: input.policy_template ? `${input.policy_template}-${input.type}` : `${input.type}`,
      type: input.type,
      ...getFullInputStreams(input, true),
    };

    // deeply merge the input.config values with the full policy input stream
    merge(
      fullInputStream,
      Object.entries(input.config || {}).reduce((acc, [key, { value }]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, unknown>)
    );
    fullInputsStreams.push(fullInputStream);
  });

  return fullInputsStreams;
};

export async function getTemplateInputs(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string,
  format: 'yml',
  prerelease?: boolean,
  ignoreUnverified?: boolean
): Promise<string>;
export async function getTemplateInputs(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string,
  format: 'json',
  prerelease?: boolean,
  ignoreUnverified?: boolean
): Promise<{ inputs: TemplateAgentPolicyInput[] }>;
export async function getTemplateInputs(
  soClient: SavedObjectsClientContract,
  pkgName: string,
  pkgVersion: string,
  format: Format,
  prerelease?: boolean,
  ignoreUnverified?: boolean
) {
  const packageInfo = await getPackageInfo({
    savedObjectsClient: soClient,
    pkgName,
    pkgVersion,
    prerelease,
    ignoreUnverified,
  });

  const emptyPackagePolicy = packageToPackagePolicy(packageInfo, '');

  const inputsWithStreamIds = getInputsWithStreamIds(emptyPackagePolicy, undefined, true);

  const indexedInputsAndStreams = buildIndexedPackage(packageInfo);

  if (format === 'yml') {
    // Add a placeholder <VAR_NAME> to all variables without default value
    for (const inputWithStreamIds of inputsWithStreamIds) {
      const inputId = inputWithStreamIds.policy_template
        ? `${inputWithStreamIds.policy_template}-${inputWithStreamIds.type}`
        : inputWithStreamIds.type;

      const packageInput = indexedInputsAndStreams[inputId];
      if (!packageInput) {
        continue;
      }
    }
  }

  const assetsMap = await getPackageAssetsMap({
    logger: appContextService.getLogger(),
    packageInfo,
    savedObjectsClient: soClient,
    ignoreUnverified,
  });

  const compiledInputs = await _compilePackagePolicyInputs(
    packageInfo,
    emptyPackagePolicy.vars || {},
    inputsWithStreamIds,
    assetsMap
  );
  const packagePolicyWithInputs: NewPackagePolicy = {
    ...emptyPackagePolicy,
    inputs: compiledInputs,
  };
  const inputs = templatePackagePolicyToFullInputStreams(
    packagePolicyWithInputs.inputs as PackagePolicyInput[]
  );

  if (format === 'json') {
    return { inputs };
  } else if (format === 'yml') {
    const yaml = dump(
      { inputs },
      {
        skipInvalid: true,
        sortKeys: _sortYamlKeys,
      }
    );
    return addCommentsToYaml(yaml, buildIndexedPackage(packageInfo));
  }

  return { inputs: [] };
}

function getPlaceholder(varDef: RegistryVarsEntry) {
  return `<${varDef.name.toUpperCase()}>`;
}

function buildIndexedPackage(packageInfo: PackageInfo): PackageWithInputAndStreamIndexed {
  return (
    packageInfo.policy_templates?.reduce<PackageWithInputAndStreamIndexed>(
      (inputsAcc, policyTemplate) => {
        const inputs = getNormalizedInputs(policyTemplate);

        inputs.forEach((packageInput) => {
          const inputId = `${policyTemplate.name}-${packageInput.type}`;

          const streams = getStreamsForInputType(
            packageInput.type,
            packageInfo,
            isIntegrationPolicyTemplate(policyTemplate) && policyTemplate.data_streams
              ? policyTemplate.data_streams
              : []
          ).reduce<
            Record<
              string,
              RegistryStream & {
                data_stream: { type: string; dataset: string };
              }
            >
          >((acc, stream) => {
            const streamId = `${packageInput.type}-${stream.data_stream.dataset}`;
            acc[streamId] = {
              ...stream,
            };
            return acc;
          }, {});

          inputsAcc[inputId] = {
            ...packageInput,
            streams,
          };
        });
        return inputsAcc;
      },
      {}
    ) ?? {}
  );
}

function addCommentsToYaml(
  yaml: string,
  packageIndexInputAndStreams: PackageWithInputAndStreamIndexed
) {
  const doc = yamlDoc.parseDocument(yaml);
  // Add input and streams comments
  const yamlInputs = doc.get('inputs');
  if (yamlDoc.isCollection(yamlInputs)) {
    yamlInputs.items.forEach((inputItem) => {
      if (!yamlDoc.isMap(inputItem)) {
        return;
      }
      const inputIdNode = inputItem.get('id', true);
      if (!yamlDoc.isScalar(inputIdNode)) {
        return;
      }
      const inputId = inputIdNode.value as string;
      const pkgInput = packageIndexInputAndStreams[inputId];
      if (pkgInput) {
        inputItem.commentBefore = ` ${pkgInput.title}${
          pkgInput.description ? `: ${pkgInput.description}` : ''
        }`;

        yamlDoc.visit(inputItem, {
          Scalar(key, node) {
            if (node.value) {
              const val = node.value.toString();
              for (const varDef of pkgInput.vars ?? []) {
                const placeholder = getPlaceholder(varDef);
                if (val.includes(placeholder)) {
                  node.comment = ` ${varDef.title}${
                    varDef.description ? `: ${varDef.description}` : ''
                  }`;
                }
              }
            }
          },
        });

        const yamlStreams = inputItem.get('streams');
        if (!yamlDoc.isCollection(yamlStreams)) {
          return;
        }
        yamlStreams.items.forEach((streamItem) => {
          if (!yamlDoc.isMap(streamItem)) {
            return;
          }
          const streamIdNode = streamItem.get('id', true);
          if (yamlDoc.isScalar(streamIdNode)) {
            const streamId = streamIdNode.value as string;
            const pkgStream = pkgInput.streams[streamId];
            if (pkgStream) {
              streamItem.commentBefore = ` ${pkgStream.title}${
                pkgStream.description ? `: ${pkgStream.description}` : ''
              }`;
              yamlDoc.visit(streamItem, {
                Scalar(key, node) {
                  if (node.value) {
                    const val = node.value.toString();
                    for (const varDef of pkgStream.vars ?? []) {
                      const placeholder = getPlaceholder(varDef);
                      if (val.includes(placeholder)) {
                        node.comment = ` ${varDef.title}${
                          varDef.description ? `: ${varDef.description}` : ''
                        }`;
                      }
                    }
                  }
                },
              });
            }
          }
        });
      }
    });
  }

  return doc.toString();
}
