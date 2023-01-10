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

const DATA_STREAM_DATASET_VAR: RegistryVarsEntry = {
  name: 'data_stream.dataset',
  type: 'text',
  title: 'Dataset name',
  description:
    "Set the name for your dataset. Once selected a dataset cannot be changed without creating a new integration policy. You can't use `-` in the name of a dataset and only valid characters for [Elasticsearch index names](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html) are permitted.\n",
  multi: false,
  required: true,
  show_user: true,
};

export function isInputOnlyPolicyTemplate(
  policyTemplate: RegistryPolicyTemplate
): policyTemplate is RegistryPolicyInputOnlyTemplate {
  return 'input' in policyTemplate;
}

export function isIntegrationPolicyTemplate(
  policyTemplate: RegistryPolicyTemplate
): policyTemplate is RegistryPolicyIntegrationTemplate {
  return !isInputOnlyPolicyTemplate(policyTemplate);
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

export const getNormalizedDataStreams = (
  packageInfo: PackageInfo,
  datasetName?: string
): RegistryDataStream[] => {
  if (packageInfo.type !== 'input') {
    return packageInfo.data_streams || [];
  }

  const policyTemplates = packageInfo.policy_templates as RegistryPolicyInputOnlyTemplate[];

  if (!policyTemplates || policyTemplates.length === 0) {
    return [];
  }

  return policyTemplates.map((policyTemplate) => {
    const dataStream: RegistryDataStream = {
      type: policyTemplate.type,
      dataset: datasetName || createDefaultDatasetName(packageInfo, policyTemplate),
      title: policyTemplate.title + ' Dataset',
      release: packageInfo.release || 'ga',
      package: packageInfo.name,
      path: packageInfo.name,
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
    };

    return dataStream;
  });
};

// Input only packages must provide a dataset name in order to differentiate their data streams
// here we add the dataset var if it is not defined in the package already.
const addDatasetVarIfNotPresent = (vars?: RegistryVarsEntry[]): RegistryVarsEntry[] => {
  const newVars = vars ?? [];

  const isDatasetAlreadyAdded = newVars.find(
    (varEntry) => varEntry.name === DATA_STREAM_DATASET_VAR.name
  );

  if (isDatasetAlreadyAdded) {
    return newVars;
  } else {
    return [...newVars, DATA_STREAM_DATASET_VAR];
  }
};

const createDefaultDatasetName = (
  packageInfo: PackageInfo,
  policyTemplate: RegistryPolicyInputOnlyTemplate
): string => packageInfo.name + '.' + policyTemplate.name;
