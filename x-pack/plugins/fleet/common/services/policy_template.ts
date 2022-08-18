/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RegistryPolicyTemplate,
  RegistryPolicyInputOnlyTemplate,
  RegistryPolicyIntegrationTemplate,
  RegistryInput,
  PackageInfo,
  RegistryVarsEntry,
  RegistryDataStream,
} from '../types';

const DATASET_VAR: RegistryVarsEntry = {
  name: 'data_stream.dataset',
  type: 'text',
  title: 'Dataset name',
  description:
    "Set the name for your dataset. Changing the dataset will send the data to a different index. You can't use `-` in the name of a dataset and only valid characters for [Elasticsearch index names](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html).\n",
  multi: false,
  required: true,
  show_user: true,
  // default: 'generic', // TODO
};

export function isInputOnlyPolicyTemplate(
  policyTemplate: RegistryPolicyTemplate
): policyTemplate is RegistryPolicyInputOnlyTemplate {
  return 'input' in policyTemplate;
}

export function isIntegrationPolicyTemplate(
  policyTemplate: RegistryPolicyTemplate
): policyTemplate is RegistryPolicyIntegrationTemplate {
  return 'inputs' in policyTemplate;
}

export const getNormalizedInputs = (policyTemplate: RegistryPolicyTemplate): RegistryInput[] => {
  if (isIntegrationPolicyTemplate(policyTemplate)) {
    return policyTemplate.inputs || [];
  }

  const input: RegistryInput = {
    type: policyTemplate.input,
    title: policyTemplate.title,
    description: policyTemplate.description,
  };

  return [input];
};

export const getNormalizedDataStreams = (packageInfo: PackageInfo): RegistryDataStream[] => {
  if (packageInfo.type !== 'input') {
    return packageInfo.data_streams || [];
  }

  if (!packageInfo.policy_templates || packageInfo.policy_templates.length === 0) {
    return [];
  }

  return packageInfo.policy_templates.map((policyTemplate) => {
    if (!isInputOnlyPolicyTemplate(policyTemplate)) throw new Error('boom'); // TODO make this nice
    const dataStream: RegistryDataStream = {
      type: policyTemplate.type,
      dataset: createDefaultDatasetName(packageInfo, policyTemplate),
      title: policyTemplate.title + ' Dataset', // TODO is this nice
      release: packageInfo.release || 'ga', // TODO is this right
      streams: [
        {
          input: policyTemplate.input,
          vars: addDatasetVarIfNotPresent(policyTemplate.vars),
          template_path: policyTemplate.template_path,
          title: policyTemplate.title,
          description: policyTemplate.title,
          enabled: true,
        },
      ],
      package: packageInfo.name,
      path: packageInfo.name, // TODO what does this do
    };

    return dataStream;
  });
};

const addDatasetVarIfNotPresent = (vars?: RegistryVarsEntry[]): RegistryVarsEntry[] => {
  const newVars = vars ?? [];

  const isDatasetAlreadyAdded = newVars.find((varEntry) => varEntry.name === DATASET_VAR.name);

  if (isDatasetAlreadyAdded) {
    return newVars;
  } else {
    return [...newVars, DATASET_VAR];
  }
};

const createDefaultDatasetName = (
  packageInfo: PackageInfo,
  policyTemplate: RegistryPolicyInputOnlyTemplate
): string => packageInfo.name + '.' + policyTemplate.type;
