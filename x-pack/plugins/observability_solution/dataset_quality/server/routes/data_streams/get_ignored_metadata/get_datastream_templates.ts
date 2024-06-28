/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesIndexSettings,
  IndicesIndexTemplateSummary,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import { DatasetQualityESClient } from '../../../utils/create_dataset_quality_es_client';
import { getMappingForField } from './utils';

export interface DataStreamTemplateMetadata {
  indexTemplateName: string;
  doesIndexTemplateExists: boolean;
  indexTemplateSettingsAndMappings: IndicesIndexTemplateSummary | undefined;
  customComponentTemplates: string[];
  customComponentTemplatesSettingsAndMappings: {
    [key: string]: ComponentTemplateMetadata | undefined;
  };
}

export interface ComponentTemplateMetadata {
  settings: Record<string, IndicesIndexSettings> | undefined;
  mappings: MappingProperty | Record<string, MappingProperty> | undefined;
}

export async function getDataStreamTemplates({
  datasetQualityESClient,
  dataStream,
  field,
}: {
  datasetQualityESClient: DatasetQualityESClient;
  dataStream: string;
  field: string;
}): Promise<DataStreamTemplateMetadata> {
  const dataStreamDetails = await datasetQualityESClient.getDataStream({ name: dataStream });

  const indexTemplateName = dataStreamDetails.data_streams[0].template;
  let doesIndexTemplateExists = true;
  let indexTemplateSettingsAndMappings;
  let customComponentTemplates: string[] = [];
  let customComponentTemplatesSettingsAndMappings = {};

  try {
    const indexTemplate = await datasetQualityESClient.getIndexTemplate({
      name: indexTemplateName,
    });

    // Here we are returning the whole index template settings and mappings.
    // Considering the mappings inside Index Template to be not huge, if its huge then we need to use the
    // `getMappingForField` function here also to extract specific information.
    indexTemplateSettingsAndMappings = indexTemplate.index_templates[0].index_template.template;
    const composedOf = indexTemplate.index_templates[0].index_template.composed_of;
    customComponentTemplates = composedOf.filter((template) => template.endsWith('@custom'));
    customComponentTemplatesSettingsAndMappings = await getComponentTemplatesMetadata({
      datasetQualityESClient,
      componentTemplates: customComponentTemplates,
      field,
    });
  } catch (e) {
    // Generally this would never occur, but sometimes by mistake someone can delete the indexTemplate.
    doesIndexTemplateExists = false;
    indexTemplateSettingsAndMappings = undefined;
  }

  return {
    indexTemplateName,
    doesIndexTemplateExists,
    indexTemplateSettingsAndMappings,
    customComponentTemplates,
    customComponentTemplatesSettingsAndMappings,
  };
}

async function getComponentTemplatesMetadata({
  datasetQualityESClient,
  componentTemplates,
  field,
}: {
  datasetQualityESClient: DatasetQualityESClient;
  componentTemplates: string[];
  field: string;
}): Promise<{ [key: string]: ComponentTemplateMetadata | undefined }> {
  const result: { [key: string]: ComponentTemplateMetadata | undefined } = {};

  const promises = componentTemplates.map(async (componentTemplate) => {
    result[componentTemplate] = await getComponentTemplates({
      datasetQualityESClient,
      componentTemplateName: componentTemplate,
      field,
    });
  });

  await Promise.all(promises);

  return result;
}

async function getComponentTemplates({
  datasetQualityESClient,
  componentTemplateName,
  field,
}: {
  datasetQualityESClient: DatasetQualityESClient;
  componentTemplateName: string;
  field: string;
}): Promise<ComponentTemplateMetadata | undefined> {
  let mappingForField;
  try {
    const componentTemplate = await datasetQualityESClient.getComponentTemplate({
      name: componentTemplateName,
    });
    const componentTemplateSettings =
      componentTemplate.component_templates[0].component_template.template.settings;
    const componentTemplateMappings =
      componentTemplate.component_templates[0].component_template.template.mappings;
    if (componentTemplateMappings) {
      mappingForField = getMappingForField(componentTemplateMappings, field);
    }
    return {
      settings: componentTemplateSettings,
      mappings: mappingForField,
    };
  } catch (e) {
    return undefined;
  }
}
