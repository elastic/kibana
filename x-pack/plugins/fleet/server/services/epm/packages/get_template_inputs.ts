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
} from '../../../../common/types';
import { _sortYamlKeys } from '../../../../common/services/full_agent_policy_to_yaml';

import { getFullInputStreams } from '../../agent_policies/package_policies_to_agent_inputs';

import { getPackageInfo } from '.';
import { getPackageAssetsMap } from './get';

type Format = 'yml' | 'json';

type PackageComments = Record<
  string,
  {
    comment: string;
    vars: Record<string, RegistryVarsEntry>;
    streams: Record<
      string,
      {
        comment: string;
        vars: Record<string, RegistryVarsEntry>;
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
  const packageInfoMap = new Map<string, PackageInfo>();
  let packageInfo: PackageInfo;

  if (packageInfoMap.has(pkgName)) {
    packageInfo = packageInfoMap.get(pkgName)!;
  } else {
    packageInfo = await getPackageInfo({
      savedObjectsClient: soClient,
      pkgName,
      pkgVersion,
      prerelease,
      ignoreUnverified,
    });
  }

  const emptyPackagePolicy = packageToPackagePolicy(packageInfo, '');

  const inputsWithStreamIds = getInputsWithStreamIds(emptyPackagePolicy, undefined, true);

  // Add a placeholder <VAR_NAME> to all variables without default value
  for (const inputWithStreamIds of inputsWithStreamIds) {
    const policyTemplate = packageInfo.policy_templates?.find(
      (_policyTemplate) => _policyTemplate.name === inputWithStreamIds.policy_template
    );
    if (!policyTemplate) {
      continue;
    }
    const normalizedInputs = getNormalizedInputs(policyTemplate);

    const packageInput = normalizedInputs.find((_input) => _input.type === inputWithStreamIds.type);
    if (!packageInput) {
      continue;
    }
    const streams = getStreamsForInputType(
      packageInput.type,
      packageInfo,
      isIntegrationPolicyTemplate(policyTemplate) && policyTemplate.data_streams
        ? policyTemplate.data_streams
        : []
    );

    for (const [inputVarKey, inputVarValue] of Object.entries(inputWithStreamIds.vars ?? {})) {
      const varDef = packageInput.vars?.find((_varDef) => _varDef.name === inputVarKey);
      if (varDef && !inputVarValue.value && varDef.type !== 'yaml') {
        const placeHolder = `<${inputVarKey.toUpperCase()}>`;
        inputVarValue.value = placeHolder;
      }
    }
    for (const stream of inputWithStreamIds.streams) {
      const packageStream = streams.find(
        (_stream) => _stream.data_stream.dataset === stream.data_stream.dataset
      );
      if (!packageStream) {
        continue;
      }
      for (const [streamVarKey, streamVarValue] of Object.entries(stream.vars ?? {})) {
        const varDef = packageStream.vars?.find((_varDef) => _varDef.name === streamVarKey);
        if (varDef && !streamVarValue.value && varDef.type !== 'yaml') {
          const placeHolder = `<${streamVarKey.toUpperCase()}>`;
          streamVarValue.value = placeHolder;
        }
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
    return addCommentsToYaml(yaml, buildPackageComments(packageInfo));
  }

  return { inputs: [] };
}

function buildPackageComments(packageInfo: PackageInfo): PackageComments {
  return (
    packageInfo.policy_templates?.reduce<
      Record<
        string,
        {
          comment: string;
          vars: Record<string, RegistryVarsEntry>;
          streams: Record<
            string,
            {
              comment: string;
              vars: Record<string, RegistryVarsEntry>;
            }
          >;
        }
      >
    >((inputComments, policyTemplate) => {
      const inputs = getNormalizedInputs(policyTemplate);

      inputs.forEach((packageInput) => {
        const inputId = `${policyTemplate.name}-${packageInput.type}`;

        const streams = getStreamsForInputType(
          packageInput.type,
          packageInfo,
          isIntegrationPolicyTemplate(policyTemplate) && policyTemplate.data_streams
            ? policyTemplate.data_streams
            : []
        ).reduce<Record<string, { comment: string; vars: Record<string, RegistryVarsEntry> }>>(
          (acc, stream) => {
            const streamId = `${packageInput.type}-${stream.data_stream.dataset}`;
            acc[streamId] = {
              comment: ` ${stream.title} ${stream.description}`,
              vars:
                stream.vars?.reduce<Record<string, RegistryVarsEntry>>((varsAcc, varDef) => {
                  varsAcc[`<${varDef.name.toUpperCase()}>`] = varDef;
                  return varsAcc;
                }, {}) ?? {},
            };
            return acc;
          },
          {}
        );

        const vars =
          packageInput.vars?.reduce<Record<string, RegistryVarsEntry>>((acc, varDef) => {
            acc[`<${varDef.name.toUpperCase()}>`] = varDef;
            return acc;
          }, {}) ?? {};

        inputComments[inputId] = {
          comment: ` ${packageInput.title} ${packageInput.description}`,
          streams,
          vars,
        };
      });
      return inputComments;
    }, {}) ?? {}
  );
}

function addCommentsToYaml(yaml: string, packageComments: PackageComments) {
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
      const inputComments = packageComments[inputId];
      if (inputComments) {
        inputItem.commentBefore = inputComments.comment;

        yamlDoc.visit(inputItem, {
          Scalar(key, node) {
            if (node.value) {
              const val = node.value.toString();
              for (const placeholder of Object.keys(inputComments.vars)) {
                if (val.includes(placeholder)) {
                  const varDef = inputComments.vars[placeholder];
                  node.comment = ` ${varDef.title}${
                    varDef.description ? ` ${varDef.description}` : ''
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
            const streamComments = inputComments.streams[streamId];
            if (streamComments) {
              streamItem.commentBefore = streamComments.comment;
              yamlDoc.visit(streamItem, {
                Scalar(key, node) {
                  if (node.value) {
                    const val = node.value.toString();
                    for (const placeholder of Object.keys(streamComments.vars)) {
                      if (val.includes(placeholder)) {
                        const varDef = streamComments.vars[placeholder];
                        node.comment = ` ${varDef.title}${
                          varDef.description ? ` ${varDef.description}` : ''
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
