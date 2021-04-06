/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PackageInfo, RegistryInputGroup, RegistryVarsEntry } from '../types';

import { doesPackageHaveIntegrations, getStreamsForInputType, findDataStreamsByNames } from './';

interface InputGroupWithStreams extends RegistryInputGroup {
  vars?: RegistryVarsEntry[];
  streams?: ReturnType<typeof getStreamsForInputType>;
}

export const groupInputs = (packageInfo: PackageInfo): InputGroupWithStreams[] => {
  const inputGroups: InputGroupWithStreams[] = [...(packageInfo.input_groups || [])];
  const hasIntegrations = doesPackageHaveIntegrations(packageInfo);
  const { policy_templates: policyTemplates = [] } = packageInfo;

  // If no policy templates, return no groups
  if (policyTemplates.length === 0) {
    return inputGroups;
  }

  // If no integrations, return first policy template's inputs as groups
  if (!hasIntegrations) {
    (policyTemplates[0].inputs || []).forEach(({ type, ...input }) => {
      inputGroups.push({
        ...input,
        name: type,
        streams: getStreamsForInputType(type, packageInfo.data_streams),
      });
    });
    return inputGroups;
  }

  // Otherwise look in each policy template
  policyTemplates.forEach((policyTemplate) => {
    const policyTemplateDataStreams = findDataStreamsByNames(
      policyTemplate.data_streams,
      packageInfo.data_streams
    );

    (policyTemplate.inputs || []).forEach(({ type, input_group: inputGroupName }) => {
      // Package should already have `input_groups` defined and each input should have an `input_group`
      // If either one of these conditions aren't met, skip adding this input
      const inputGroup = inputGroupName
        ? inputGroups.find((group) => group.name === inputGroupName)
        : undefined;
      if (!inputGroup) {
        return;
      }

      inputGroup.streams = [
        ...(inputGroup.streams || []),
        ...getStreamsForInputType(type, policyTemplateDataStreams),
      ];
    });
  });

  return inputGroups;
};
