/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { Field, Fields } from '../../fields/field';
import type {
  RegistryDataStream,
  IndexTemplateEntry,
  IndexTemplate,
  IndexTemplateMappings,
  RegistryElasticsearch,
} from '../../../../types';
import { appContextService } from '../../..';
import { getRegistryDataStreamAssetBaseName } from '../../../../../common/services';
import {
  FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
  FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_NAME,
} from '../../../../constants';
import { getESAssetMetadata } from '../meta';
import { retryTransientEsErrors } from '../retry';

import { getDefaultProperties, histogram, keyword, scaledFloat } from './mappings';

interface Properties {
  [key: string]: any;
}

interface MultiFields {
  [key: string]: object;
}

export interface IndexTemplateMapping {
  [key: string]: any;
}
export interface CurrentDataStream {
  dataStreamName: string;
  replicated: boolean;
  indexTemplate: IndexTemplate;
}

const DEFAULT_IGNORE_ABOVE = 1024;

// see discussion in https://github.com/elastic/kibana/issues/88307
const DEFAULT_TEMPLATE_PRIORITY = 200;
const DATASET_IS_PREFIX_TEMPLATE_PRIORITY = 150;

const META_PROP_KEYS = ['metric_type', 'unit'];

/**
 * getTemplate retrieves the default template but overwrites the index pattern with the given value.
 *
 * @param indexPattern String with the index pattern
 */
export function getTemplate({
  templateIndexPattern,
  packageName,
  composedOfTemplates,
  templatePriority,
  hidden,
  registryElasticsearch,
  mappings,
  isIndexModeTimeSeries,
}: {
  templateIndexPattern: string;
  packageName: string;
  composedOfTemplates: string[];
  templatePriority: number;
  mappings: IndexTemplateMappings;
  hidden?: boolean;
  registryElasticsearch?: RegistryElasticsearch | undefined;
  isIndexModeTimeSeries?: boolean;
}): IndexTemplate {
  const template = getBaseTemplate({
    templateIndexPattern,
    packageName,
    composedOfTemplates,
    templatePriority,
    registryElasticsearch,
    hidden,
    mappings,
    isIndexModeTimeSeries,
  });
  if (template.template.settings.index.final_pipeline) {
    throw new Error(`Error template for ${templateIndexPattern} contains a final_pipeline`);
  }

  template.composed_of = [
    ...(template.composed_of || []),
    FLEET_GLOBALS_COMPONENT_TEMPLATE_NAME,
    ...(appContextService.getConfig()?.agentIdVerificationEnabled
      ? [FLEET_AGENT_ID_VERIFY_COMPONENT_TEMPLATE_NAME]
      : []),
  ];

  return template;
}

/**
 * Generate mapping takes the given nested fields array and creates the Elasticsearch
 * mapping properties out of it.
 *
 * This assumes that all fields with dotted.names have been expanded in a previous step.
 *
 * @param fields
 */
export function generateMappings(fields: Field[]): IndexTemplateMappings {
  const dynamicTemplates: Array<Record<string, Properties>> = [];
  const dynamicTemplateNames = new Set<string>();

  const { properties } = _generateMappings(fields, {
    addDynamicMapping: (dynamicMapping: {
      path: string;
      matchingType: string;
      pathMatch: string;
      properties: string;
    }) => {
      const name = dynamicMapping.path;
      if (dynamicTemplateNames.has(name)) {
        return;
      }

      const dynamicTemplate: Properties = {
        mapping: dynamicMapping.properties,
      };

      if (dynamicMapping.matchingType) {
        dynamicTemplate.match_mapping_type = dynamicMapping.matchingType;
      }

      if (dynamicMapping.pathMatch) {
        dynamicTemplate.path_match = dynamicMapping.pathMatch;
      }
      dynamicTemplateNames.add(name);
      dynamicTemplates.push({ [dynamicMapping.path]: dynamicTemplate });
    },
  });

  return dynamicTemplates.length
    ? {
        properties,
        dynamic_templates: dynamicTemplates,
      }
    : { properties };
}

/**
 * Generate mapping takes the given nested fields array and creates the Elasticsearch
 * mapping properties out of it.
 *
 * This assumes that all fields with dotted.names have been expanded in a previous step.
 *
 * @param fields
 */
function _generateMappings(
  fields: Field[],
  ctx: {
    addDynamicMapping: any;
    groupFieldName?: string;
  }
): {
  properties: IndexTemplateMappings['properties'];
  hasNonDynamicTemplateMappings: boolean;
} {
  let hasNonDynamicTemplateMappings = false;
  const props: Properties = {};
  // TODO: this can happen when the fields property in fields.yml is present but empty
  // Maybe validation should be moved to fields/field.ts
  if (fields) {
    fields.forEach((field) => {
      // If type is not defined, assume keyword
      const type = field.type || 'keyword';

      if (type === 'object' && field.object_type) {
        const path = ctx.groupFieldName ? `${ctx.groupFieldName}.${field.name}` : field.name;
        const pathMatch = path.includes('*') ? path : `${path}.*`;

        let dynProperties: Properties = getDefaultProperties(field);
        let matchingType: string | undefined;
        switch (field.object_type) {
          case 'histogram':
            dynProperties = histogram(field);
            matchingType = field.object_type_mapping_type ?? '*';
            break;
          case 'text':
            dynProperties.type = field.object_type;
            matchingType = field.object_type_mapping_type ?? 'string';
            break;
          case 'keyword':
            dynProperties.type = field.object_type;
            matchingType = field.object_type_mapping_type ?? 'string';
            break;
          case 'byte':
          case 'double':
          case 'float':
          case 'long':
          case 'short':
          case 'boolean':
            dynProperties = {
              type: field.object_type,
            };
            matchingType = field.object_type_mapping_type ?? field.object_type;
          default:
            break;
        }

        if (dynProperties && matchingType) {
          ctx.addDynamicMapping({
            path,
            pathMatch,
            matchingType,
            properties: dynProperties,
          });
        }
      } else {
        let fieldProps = getDefaultProperties(field);

        switch (type) {
          case 'group':
            const mappings = _generateMappings(field.fields!, {
              ...ctx,
              groupFieldName: ctx.groupFieldName
                ? `${ctx.groupFieldName}.${field.name}`
                : field.name,
            });
            if (!mappings.hasNonDynamicTemplateMappings) {
              return;
            }

            fieldProps = {
              properties: mappings.properties,
              ...generateDynamicAndEnabled(field),
            };
            break;
          case 'group-nested':
            fieldProps = {
              properties: _generateMappings(field.fields!, {
                ...ctx,
                groupFieldName: ctx.groupFieldName
                  ? `${ctx.groupFieldName}.${field.name}`
                  : field.name,
              }).properties,
              ...generateNestedProps(field),
              type: 'nested',
            };
            break;
          case 'integer':
            fieldProps.type = 'long';
            break;
          case 'scaled_float':
            fieldProps = scaledFloat(field);
            break;
          case 'text':
            const textMapping = generateTextMapping(field);
            fieldProps = { ...fieldProps, ...textMapping, type: 'text' };
            if (field.multi_fields) {
              fieldProps.fields = generateMultiFields(field.multi_fields);
            }
            break;
          case 'object':
            fieldProps = { ...fieldProps, ...generateDynamicAndEnabled(field), type: 'object' };
            break;
          case 'keyword':
            fieldProps = keyword(field);
            if (field.multi_fields) {
              fieldProps.fields = generateMultiFields(field.multi_fields);
            }
            break;
          case 'wildcard':
            const wildcardMapping = generateWildcardMapping(field);
            fieldProps = { ...fieldProps, ...wildcardMapping, type: 'wildcard' };
            if (field.multi_fields) {
              fieldProps.fields = generateMultiFields(field.multi_fields);
            }
            break;
          case 'constant_keyword':
            fieldProps.type = field.type;
            if (field.value) {
              fieldProps.value = field.value;
            }
            break;
          case 'nested':
            fieldProps = { ...fieldProps, ...generateNestedProps(field), type: 'nested' };
            break;
          case 'array':
            // this assumes array fields were validated in an earlier step
            // adding an array field with no object_type would result in an error
            // when the template is added to ES
            if (field.object_type) {
              fieldProps.type = field.object_type;
            }
            break;
          case 'alias':
            // this assumes alias fields were validated in an earlier step
            // adding a path to a field that doesn't exist would result in an error
            // when the template is added to ES.
            fieldProps.type = 'alias';
            fieldProps.path = field.path;
            break;
          case 'date':
            const dateMappings = generateDateMapping(field);
            fieldProps = { ...fieldProps, ...dateMappings, type: 'date' };
            break;
          case 'aggregate_metric_double':
            fieldProps = {
              ...fieldProps,
              metrics: field.metrics,
              default_metric: field.default_metric,
              type: 'aggregate_metric_double',
            };
            break;
          default:
            fieldProps.type = type;
        }

        const fieldHasMetaProps = META_PROP_KEYS.some((key) => key in field);
        if (fieldHasMetaProps) {
          switch (type) {
            case 'group':
            case 'group-nested':
              break;
            default: {
              const meta = {};
              if ('unit' in field) Reflect.set(meta, 'unit', field.unit);
              fieldProps.meta = meta;
            }
          }
        }

        if ('metric_type' in field) {
          fieldProps.time_series_metric = field.metric_type;
        }
        if (field.dimension) {
          fieldProps.time_series_dimension = field.dimension;
        }

        props[field.name] = fieldProps;
        hasNonDynamicTemplateMappings = true;
      }
    });
  }

  return { properties: props, hasNonDynamicTemplateMappings };
}

function generateDynamicAndEnabled(field: Field) {
  const props: Properties = {};
  if (field.hasOwnProperty('enabled')) {
    props.enabled = field.enabled;
  }
  if (field.hasOwnProperty('dynamic')) {
    props.dynamic = field.dynamic;
  }
  return props;
}

function generateNestedProps(field: Field) {
  const props = generateDynamicAndEnabled(field);

  if (field.hasOwnProperty('include_in_parent')) {
    props.include_in_parent = field.include_in_parent;
  }
  if (field.hasOwnProperty('include_in_root')) {
    props.include_in_root = field.include_in_root;
  }
  return props;
}

function generateMultiFields(fields: Fields): MultiFields {
  const multiFields: MultiFields = {};
  if (fields) {
    fields.forEach((f: Field) => {
      const type = f.type;
      switch (type) {
        case 'text':
          multiFields[f.name] = { ...generateTextMapping(f), type: f.type };
          break;
        case 'keyword':
          multiFields[f.name] = keyword(f);
          break;
        case 'long':
        case 'double':
        case 'match_only_text':
          multiFields[f.name] = { type: f.type };
          break;
      }
    });
  }
  return multiFields;
}

function generateTextMapping(field: Field): IndexTemplateMapping {
  const mapping: IndexTemplateMapping = {};
  if (field.analyzer) {
    mapping.analyzer = field.analyzer;
  }
  if (field.search_analyzer) {
    mapping.search_analyzer = field.search_analyzer;
  }
  return mapping;
}

function generateWildcardMapping(field: Field): IndexTemplateMapping {
  const mapping: IndexTemplateMapping = {
    ignore_above: DEFAULT_IGNORE_ABOVE,
  };
  if (field.null_value) {
    mapping.null_value = field.null_value;
  }
  if (field.ignore_above) {
    mapping.ignore_above = field.ignore_above;
  }
  return mapping;
}

function generateDateMapping(field: Field): IndexTemplateMapping {
  const mapping: IndexTemplateMapping = {};
  if (field.date_format) {
    mapping.format = field.date_format;
  }

  if (field.name === '@timestamp') {
    mapping.ignore_malformed = false;
  }

  return mapping;
}

/**
 * Generates the template name out of the given information
 */
export function generateTemplateName(dataStream: RegistryDataStream): string {
  return getRegistryDataStreamAssetBaseName(dataStream);
}

/**
 * Given a data stream name, return the indexTemplate name
 */
function dataStreamNameToIndexTemplateName(dataStreamName: string): string {
  const [type, dataset] = dataStreamName.split('-'); // ignore namespace at the end
  return [type, dataset].join('-');
}

export function generateTemplateIndexPattern(dataStream: RegistryDataStream): string {
  // undefined or explicitly set to false
  // See also https://github.com/elastic/package-spec/pull/102
  if (!dataStream.dataset_is_prefix) {
    return getRegistryDataStreamAssetBaseName(dataStream) + '-*';
  } else {
    return getRegistryDataStreamAssetBaseName(dataStream) + '.*-*';
  }
}

// Template priorities are discussed in https://github.com/elastic/kibana/issues/88307
// See also https://www.elastic.co/guide/en/elasticsearch/reference/current/index-templates.html
//
// Built-in templates like logs-*-* and metrics-*-* have priority 100
//
// EPM generated templates for data streams have priority 200 (DEFAULT_TEMPLATE_PRIORITY)
//
// EPM generated templates for data streams with dataset_is_prefix: true have priority 150 (DATASET_IS_PREFIX_TEMPLATE_PRIORITY)

export function getTemplatePriority(dataStream: RegistryDataStream): number {
  // undefined or explicitly set to false
  // See also https://github.com/elastic/package-spec/pull/102
  if (!dataStream.dataset_is_prefix) {
    return DEFAULT_TEMPLATE_PRIORITY;
  } else {
    return DATASET_IS_PREFIX_TEMPLATE_PRIORITY;
  }
}

/**
 * Returns a map of the data stream path fields to elasticsearch index pattern.
 * @param dataStreams an array of RegistryDataStream objects
 */
export function generateESIndexPatterns(
  dataStreams: RegistryDataStream[] | undefined
): Record<string, string> {
  if (!dataStreams) {
    return {};
  }

  const patterns: Record<string, string> = {};
  for (const dataStream of dataStreams) {
    patterns[dataStream.path] = generateTemplateIndexPattern(dataStream);
  }
  return patterns;
}

const flattenFieldsToNameAndType = (
  fields: Fields,
  path: string = ''
): Array<Pick<Field, 'name' | 'type'>> => {
  let newFields: Array<Pick<Field, 'name' | 'type'>> = [];
  fields.forEach((field) => {
    const fieldName = path ? `${path}.${field.name}` : field.name;
    newFields.push({
      name: fieldName,
      type: field.type,
    });
    if (field.fields && field.fields.length) {
      newFields = newFields.concat(flattenFieldsToNameAndType(field.fields, fieldName));
    }
  });
  return newFields;
};

function getBaseTemplate({
  templateIndexPattern,
  packageName,
  composedOfTemplates,
  templatePriority,
  hidden,
  registryElasticsearch,
  mappings,
  isIndexModeTimeSeries,
}: {
  templateIndexPattern: string;
  packageName: string;
  composedOfTemplates: string[];
  templatePriority: number;
  hidden?: boolean;
  registryElasticsearch: RegistryElasticsearch | undefined;
  mappings: IndexTemplateMappings;
  isIndexModeTimeSeries?: boolean;
}): IndexTemplate {
  const _meta = getESAssetMetadata({ packageName });

  let settingsIndex = {};
  if (isIndexModeTimeSeries) {
    settingsIndex = {
      mode: 'time_series',
    };
  }

  return {
    priority: templatePriority,
    index_patterns: [templateIndexPattern],
    template: {
      settings: {
        index: settingsIndex,
      },
      mappings: {
        _meta,
      },
    },
    data_stream: {
      hidden: registryElasticsearch?.['index_template.data_stream']?.hidden || hidden,
    },
    composed_of: composedOfTemplates,
    _meta,
  };
}

export const updateCurrentWriteIndices = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  templates: IndexTemplateEntry[]
): Promise<void> => {
  if (!templates.length) return;

  const allIndices = await queryDataStreamsFromTemplates(esClient, templates);
  const allUpdatablesIndices = allIndices.filter((indice) => {
    if (indice.replicated) {
      logger.warn(
        `Datastream ${indice.dataStreamName} cannot be updated because this is a replicated datastream.`
      );
      return false;
    }
    return true;
  });
  if (!allUpdatablesIndices.length) return;
  return updateAllDataStreams(allUpdatablesIndices, esClient, logger);
};

function isCurrentDataStream(item: CurrentDataStream[] | undefined): item is CurrentDataStream[] {
  return item !== undefined;
}

const queryDataStreamsFromTemplates = async (
  esClient: ElasticsearchClient,
  templates: IndexTemplateEntry[]
): Promise<CurrentDataStream[]> => {
  const dataStreamPromises = templates.map((template) => {
    return getDataStreams(esClient, template);
  });
  const dataStreamObjects = await Promise.all(dataStreamPromises);
  return dataStreamObjects.filter(isCurrentDataStream).flat();
};

const getDataStreams = async (
  esClient: ElasticsearchClient,
  template: IndexTemplateEntry
): Promise<CurrentDataStream[] | undefined> => {
  const { indexTemplate } = template;

  const body = await esClient.indices.getDataStream({
    name: indexTemplate.index_patterns.join(','),
  });

  const dataStreams = body.data_streams;
  if (!dataStreams.length) return;
  return dataStreams.map((dataStream: any) => ({
    dataStreamName: dataStream.name,
    replicated: dataStream.replicated,
    indexTemplate,
  }));
};

const rolloverDataStream = (dataStreamName: string, esClient: ElasticsearchClient) => {
  try {
    // Do no wrap rollovers in retryTransientEsErrors since it is not idempotent
    return esClient.indices.rollover({
      alias: dataStreamName,
    });
  } catch (error) {
    throw new Error(`cannot rollover data stream [${dataStreamName}] due to error: ${error}`);
  }
};

const updateAllDataStreams = async (
  indexNameWithTemplates: CurrentDataStream[],
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<void> => {
  const updatedataStreamPromises = indexNameWithTemplates.map((templateEntry) => {
    return updateExistingDataStream({
      esClient,
      logger,
      dataStreamName: templateEntry.dataStreamName,
    });
  });
  await Promise.all(updatedataStreamPromises);
};
const updateExistingDataStream = async ({
  dataStreamName,
  esClient,
  logger,
}: {
  dataStreamName: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}) => {
  const existingDs = await esClient.indices.get({
    index: dataStreamName,
  });

  const existingDsConfig = Object.values(existingDs);
  const currentBackingIndexConfig = existingDsConfig.at(-1);

  const currentIndexMode = currentBackingIndexConfig?.settings?.index?.mode;
  // @ts-expect-error Property 'mode' does not exist on type 'MappingSourceField'
  const currentSourceType = currentBackingIndexConfig.mappings?._source?.mode;

  let settings: IndicesIndexSettings;
  let mappings: MappingTypeMapping;

  try {
    const simulateResult = await retryTransientEsErrors(() =>
      esClient.indices.simulateTemplate({
        name: dataStreamNameToIndexTemplateName(dataStreamName),
      })
    );

    settings = simulateResult.template.settings;
    mappings = simulateResult.template.mappings;

    // for now, remove from object so as not to update stream or data stream properties of the index until type and name
    // are added in https://github.com/elastic/kibana/issues/66551.  namespace value we will continue
    // to skip updating and assume the value in the index mapping is correct
    if (mappings && mappings.properties) {
      delete mappings.properties.stream;
      delete mappings.properties.data_stream;
    }

    logger.debug(`Updating mappings for ${dataStreamName}`);
    await retryTransientEsErrors(
      () =>
        esClient.indices.putMapping({
          index: dataStreamName,
          body: mappings || {},
          write_index_only: true,
        }),
      { logger }
    );

    // if update fails, rollover data stream and bail out
  } catch (err) {
    logger.error(`Mappings update for ${dataStreamName} failed`);
    logger.error(err);

    await rolloverDataStream(dataStreamName, esClient);
    return;
  }

  // Trigger a rollover if the index mode or source type has changed
  if (
    currentIndexMode !== settings?.index?.mode ||
    // @ts-expect-error Property 'mode' does not exist on type 'MappingSourceField'
    currentSourceType !== mappings?._source?.mode
  ) {
    logger.info(
      `Index mode or source type has changed for ${dataStreamName}, triggering a rollover`
    );
    await rolloverDataStream(dataStreamName, esClient);
  }

  // update settings after mappings was successful to ensure
  // pointing to the new pipeline is safe
  // for now, only update the pipeline
  if (!settings?.index?.default_pipeline) {
    return;
  }

  try {
    logger.debug(`Updating settings for ${dataStreamName}`);

    await retryTransientEsErrors(
      () =>
        esClient.indices.putSettings({
          index: dataStreamName,
          body: { default_pipeline: settings!.index!.default_pipeline },
        }),
      { logger }
    );
  } catch (err) {
    throw new Error(`could not update index template settings for ${dataStreamName}`);
  }
};
