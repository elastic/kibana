/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  PackageInfo,
  RegistryInputGroup,
  RegistryVarsEntry,
  RegistryStream,
  NewPackagePolicyInputStream,
} from '../types';

type InputGroupWithStreams = RegistryInputGroup & {
  vars?: RegistryVarsEntry[];
  streams: Array<StreamWithDataStreamMeta & { policyTemplate?: string }>;
};

type StreamWithDataStreamMeta = RegistryStream & Pick<NewPackagePolicyInputStream, 'data_stream'>;

import { doesPackageHaveIntegrations } from './';

const findDataStreamsByNames = (
  names: string[] = [],
  dataStreams: PackageInfo['data_streams'] = []
): PackageInfo['data_streams'] => {
  return names.length
    ? dataStreams.filter((dataStream) => names.includes(dataStream.path))
    : dataStreams;
};

const getStreamsForInputType = (
  inputType: string,
  dataStreams: PackageInfo['data_streams'] = []
): StreamWithDataStreamMeta[] => {
  const streams: StreamWithDataStreamMeta[] = [];

  dataStreams.forEach((dataStream) => {
    (dataStream.streams || []).forEach((stream) => {
      if (stream.input === inputType) {
        streams.push({
          ...stream,
          data_stream: {
            type: dataStream.type,
            dataset: dataStream.dataset,
          },
        });
      }
    });
  });

  return streams;
};

export const groupInputs = (packageInfo: PackageInfo): InputGroupWithStreams[] => {
  const inputGroups: InputGroupWithStreams[] = [
    ...(packageInfo.input_groups?.map((inputGroup) => ({ ...inputGroup, streams: [] })) || []),
  ];
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

      inputGroup.streams.push(
        ...getStreamsForInputType(type, policyTemplateDataStreams).map((stream) => ({
          ...stream,
          policyTemplate: policyTemplate.name,
        }))
      );
    });
  });

  return inputGroups;
};
