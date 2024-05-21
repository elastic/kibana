/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';
import type { CoreSetup } from '@kbn/core/server';
import type { FieldsMetadataServerSetup } from '@kbn/fields-metadata-plugin/server';

import type { PartialFieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';

import type { FleetStartContract, FleetStartDeps } from '../plugin';
import type { AssetsMap, RegistryDataStream } from '../types';

interface RegistrationDeps {
  core: CoreSetup<FleetStartDeps, FleetStartContract>;
  fieldsMetadata: FieldsMetadataServerSetup;
}

type IntegrationFieldMetadata = Pick<
  PartialFieldMetadataPlain,
  'description' | 'flat_name' | 'name' | 'type'
>;

type InputField =
  | {
      name: string;
      type: string;
      description?: string;
    }
  | {
      name: string;
      type: 'group';
      fields: InputField[];
    };

export const registerIntegrationFieldsExtractor = ({ core, fieldsMetadata }: RegistrationDeps) => {
  fieldsMetadata.registerIntegrationFieldsExtractor(
    async ({ integration, dataset }: { integration: string; dataset?: string }) => {
      const [_core, _startDeps, { packageService }] = await core.getStartServices();

      // Attempt retrieving latest integration version
      const latestPackage = await packageService.asInternalUser.fetchFindLatestPackage(integration);

      const { name, version } = latestPackage;
      const resolvedIntegration = await packageService.asInternalUser.getPackage(name, version);

      if (!resolvedIntegration) {
        throw new Error('The integration assets you are looking for cannot be retrieved.');
      }

      const dataStreamsMap = resolveDataStreamsMap(resolvedIntegration.packageInfo.data_streams);

      const { assetsMap } = resolvedIntegration;

      if (dataStreamsMap.has(dataset)) {
        const dataStream = dataStreamsMap.get(dataset);

        return resolveDataStreamFields({ dataStream, assetsMap });
      } else {
        return [...dataStreamsMap.values()].reduce(
          (integrationDataStreamsFields, dataStream) =>
            Object.assign(
              integrationDataStreamsFields,
              resolveDataStreamFields({ dataStream, assetsMap })
            ),
          {}
        );
      }
    }
  );
};

const EXCLUDED_FILES = ['ecs.yml'];

const isFieldsAsset = (assetPath: string, datasetPath: string) => {
  return new RegExp(
    `.*\/data_stream\/${datasetPath}\/fields\/(?!(${EXCLUDED_FILES.join('|')})$).*\.yml`,
    'i'
  ).test(assetPath);
};

const getFieldAssetPaths = (assetsMap: AssetsMap, datasetPath: string) => {
  return [...assetsMap.keys()].filter((path) => isFieldsAsset(path, datasetPath));
};

const flattenFields = (
  fields: InputField[],
  prefix = ''
): Record<string, IntegrationFieldMetadata> => {
  return fields.reduce((acc, field) => {
    const fqn = prefix ? `${prefix}.${field.name}` : field.name;

    if (isGroupField(field)) {
      return Object.assign(acc, flattenFields(field.fields || [], fqn));
    }

    const integrationFieldMetadata = {
      description: field.description,
      flat_name: fqn,
      name: field.name,
      type: field.type,
    };

    acc[fqn] = integrationFieldMetadata;
    return acc;
  }, {} as Record<string, IntegrationFieldMetadata>);
};

const isGroupField = (field: InputField): field is Extract<InputField, { type: 'group' }> => {
  return field.type === 'group';
};

const resolveDataStreamsMap = (dataStreams?: RegistryDataStream[]) => {
  if (!dataStreams) return new Map();

  return dataStreams.reduce((dataStreamsMap, dataStream) => {
    dataStreamsMap.set(dataStream.dataset, {
      datasetName: dataStream.dataset,
      datasetPath: dataStream.path,
    });
    return dataStreamsMap;
  }, new Map() as Map<string, { datasetName: string; datasetPath: string }>);
};

const resolveDataStreamFields = ({
  dataStream,
  assetsMap,
}: {
  dataStream: RegistryDataStream;
  assetsMap: AssetsMap;
}) => {
  const { datasetName, datasetPath } = dataStream;
  const fieldsAssetPaths = getFieldAssetPaths(assetsMap, datasetPath);

  const fields = fieldsAssetPaths.reduce((fieldsMap, path) => {
    const fieldsAsset = assetsMap.get(path);
    if (fieldsAsset) {
      const fieldsAssetJSON = load(fieldsAsset.toString('utf8'));
      const flattenedFields = flattenFields(fieldsAssetJSON);
      Object.assign(fieldsMap, flattenedFields);
    }

    return fieldsMap;
  }, {} as Record<string, IntegrationFieldMetadata>);

  return {
    [datasetName]: fields,
  };
};
