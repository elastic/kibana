/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import type { FieldMetadataPlain } from '@kbn/fields-metadata-plugin/common';
import type { ExtractedDatasetFields } from '@kbn/fields-metadata-plugin/server';

import { load } from 'js-yaml';

import type { RegistryDataStream } from '../../../../common';
import type { AssetsMap } from '../../../../common/types';

type InputField =
  | FieldMetadataPlain
  | {
      name: string;
      type: 'group';
      fields: InputField[];
    };

export const withPackageSpan = <T>(stepName: string, func: () => Promise<T>) =>
  withSpan({ name: stepName, type: 'package' }, func);

const normalizeFields = (fields: InputField[], prefix = ''): ExtractedDatasetFields => {
  return fields.reduce((normalizedFields, field) => {
    const flatName = prefix ? `${prefix}.${field.name}` : field.name;
    // Recursively resolve field groups
    if (isGroupField(field)) {
      return Object.assign(normalizedFields, normalizeFields(field.fields || [], flatName));
    }

    normalizedFields[flatName] = createIntegrationField(field, flatName);

    return normalizedFields;
  }, {} as ExtractedDatasetFields);
};

const createIntegrationField = (
  field: Omit<FieldMetadataPlain, 'flat_name'>,
  flatName: string
) => ({
  ...field,
  flat_name: flatName,
});

const isGroupField = (field: InputField): field is Extract<InputField, { type: 'group' }> => {
  return field.type === 'group';
};

export const resolveDataStreamsMap = (
  dataStreams?: RegistryDataStream[]
): Map<string, RegistryDataStream> => {
  if (!dataStreams) return new Map();

  return dataStreams.reduce((dataStreamsMap, dataStream) => {
    dataStreamsMap.set(dataStream.dataset, dataStream);
    return dataStreamsMap;
  }, new Map() as Map<string, RegistryDataStream>);
};

export const resolveDataStreamFields = ({
  dataStream,
  assetsMap,
  excludedFieldsAssets,
}: {
  dataStream: RegistryDataStream;
  assetsMap: AssetsMap;
  excludedFieldsAssets?: string[];
}) => {
  const { dataset, path } = dataStream;
  const dataStreamFieldsAssetPaths = getDataStreamFieldsAssetPaths(
    assetsMap,
    path,
    excludedFieldsAssets
  );

  const fields = dataStreamFieldsAssetPaths.reduce((dataStreamFields, fieldsAssetPath) => {
    const fieldsAssetBuffer = assetsMap.get(fieldsAssetPath);

    if (fieldsAssetBuffer) {
      const fieldsAssetJSON = load(fieldsAssetBuffer.toString('utf8'));
      const normalizedFields = normalizeFields(fieldsAssetJSON);
      Object.assign(dataStreamFields, normalizedFields);
    }

    return dataStreamFields;
  }, {} as ExtractedDatasetFields);

  return {
    [dataset]: fields,
  };
};

const isFieldsAsset = (
  assetPath: string,
  dataStreamPath: string,
  excludedFieldsAssets: string[] = []
) => {
  return new RegExp(
    `.*\/data_stream\/${dataStreamPath}\/fields\/(?!(${excludedFieldsAssets.join('|')})$).*\.yml`,
    'i'
  ).test(assetPath);
};

const getDataStreamFieldsAssetPaths = (
  assetsMap: AssetsMap,
  dataStreamPath: string,
  excludedFieldsAssets?: string[]
) => {
  return [...assetsMap.keys()].filter((path) =>
    isFieldsAsset(path, dataStreamPath, excludedFieldsAssets)
  );
};
