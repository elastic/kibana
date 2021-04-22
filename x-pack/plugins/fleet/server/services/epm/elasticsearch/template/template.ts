/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'kibana/server';

import type { Field, Fields } from '../../fields/field';
import type {
  RegistryDataStream,
  TemplateRef,
  IndexTemplate,
  IndexTemplateMappings,
} from '../../../../types';
import { appContextService } from '../../../';
import { getRegistryDataStreamAssetBaseName } from '../index';

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
  indexTemplate: IndexTemplate;
}
const DEFAULT_SCALING_FACTOR = 1000;
const DEFAULT_IGNORE_ABOVE = 1024;

// see discussion in https://github.com/elastic/kibana/issues/88307
const DEFAULT_TEMPLATE_PRIORITY = 200;
const DATASET_IS_PREFIX_TEMPLATE_PRIORITY = 150;

const QUERY_DEFAULT_FIELD_TYPES = ['keyword', 'text'];
const QUERY_DEFAULT_FIELD_LIMIT = 1024;

/**
 * getTemplate retrieves the default template but overwrites the index pattern with the given value.
 *
 * @param indexPattern String with the index pattern
 */
export function getTemplate({
  type,
  templateIndexPattern,
  fields,
  mappings,
  pipelineName,
  packageName,
  composedOfTemplates,
  templatePriority,
  ilmPolicy,
  hidden,
}: {
  type: string;
  templateIndexPattern: string;
  fields: Fields;
  mappings: IndexTemplateMappings;
  pipelineName?: string | undefined;
  packageName: string;
  composedOfTemplates: string[];
  templatePriority: number;
  ilmPolicy?: string | undefined;
  hidden?: boolean;
}): IndexTemplate {
  const template = getBaseTemplate(
    type,
    templateIndexPattern,
    fields,
    mappings,
    packageName,
    composedOfTemplates,
    templatePriority,
    ilmPolicy,
    hidden
  );
  if (pipelineName) {
    template.template.settings.index.default_pipeline = pipelineName;
  }
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
  const props: Properties = {};
  // TODO: this can happen when the fields property in fields.yml is present but empty
  // Maybe validation should be moved to fields/field.ts
  if (fields) {
    fields.forEach((field) => {
      // If type is not defined, assume keyword
      const type = field.type || 'keyword';

      let fieldProps = getDefaultProperties(field);

      switch (type) {
        case 'group':
          fieldProps = { ...generateMappings(field.fields!), ...generateDynamicAndEnabled(field) };
          break;
        case 'group-nested':
          fieldProps = {
            ...generateMappings(field.fields!),
            ...generateNestedProps(field),
            type: 'nested',
          };
          break;
        case 'integer':
          fieldProps.type = 'long';
          break;
        case 'scaled_float':
          fieldProps.type = 'scaled_float';
          fieldProps.scaling_factor = field.scaling_factor || DEFAULT_SCALING_FACTOR;
          break;
        case 'text':
          const textMapping = generateTextMapping(field);
          fieldProps = { ...fieldProps, ...textMapping, type: 'text' };
          if (field.multi_fields) {
            fieldProps.fields = generateMultiFields(field.multi_fields);
          }
          break;
        case 'keyword':
          const keywordMapping = generateKeywordMapping(field);
          fieldProps = { ...fieldProps, ...keywordMapping, type: 'keyword' };
          if (field.multi_fields) {
            fieldProps.fields = generateMultiFields(field.multi_fields);
          }
          break;
        case 'object':
          fieldProps = { ...fieldProps, ...generateDynamicAndEnabled(field), type: 'object' };
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
        default:
          fieldProps.type = type;
      }
      props[field.name] = fieldProps;
    });
  }

  return { properties: props };
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
          multiFields[f.name] = { ...generateKeywordMapping(f), type: f.type };
          break;
        case 'long':
          multiFields[f.name] = { type: f.type };
          break;
        case 'double':
          multiFields[f.name] = { type: f.type };
          break;
      }
    });
  }
  return multiFields;
}

function generateKeywordMapping(field: Field): IndexTemplateMapping {
  const mapping: IndexTemplateMapping = {
    ignore_above: DEFAULT_IGNORE_ABOVE,
  };
  if (field.ignore_above) {
    mapping.ignore_above = field.ignore_above;
  }
  if (field.normalizer) {
    mapping.normalizer = field.normalizer;
  }
  return mapping;
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

function getDefaultProperties(field: Field): Properties {
  const properties: Properties = {};

  if (field.index) {
    properties.index = field.index;
  }
  if (field.doc_values) {
    properties.doc_values = field.doc_values;
  }
  if (field.copy_to) {
    properties.copy_to = field.copy_to;
  }

  return properties;
}

/**
 * Generates the template name out of the given information
 */
export function generateTemplateName(dataStream: RegistryDataStream): string {
  return getRegistryDataStreamAssetBaseName(dataStream);
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

function getBaseTemplate(
  type: string,
  templateIndexPattern: string,
  fields: Fields,
  mappings: IndexTemplateMappings,
  packageName: string,
  composedOfTemplates: string[],
  templatePriority: number,
  ilmPolicy?: string | undefined,
  hidden?: boolean
): IndexTemplate {
  const logger = appContextService.getLogger();

  // Meta information to identify Ingest Manager's managed templates and indices
  const _meta = {
    package: {
      name: packageName,
    },
    managed_by: 'ingest-manager',
    managed: true,
  };

  // Find all field names to set `index.query.default_field` to, which will be
  // the first 1024 keyword or text fields
  const defaultFields = flattenFieldsToNameAndType(fields).filter(
    (field) => field.type && QUERY_DEFAULT_FIELD_TYPES.includes(field.type)
  );
  if (defaultFields.length > QUERY_DEFAULT_FIELD_LIMIT) {
    logger.warn(
      `large amount of default fields detected for index template ${templateIndexPattern} in package ${packageName}, applying the first ${QUERY_DEFAULT_FIELD_LIMIT} fields`
    );
  }
  const defaultFieldNames = (defaultFields.length > QUERY_DEFAULT_FIELD_LIMIT
    ? defaultFields.slice(0, QUERY_DEFAULT_FIELD_LIMIT)
    : defaultFields
  ).map((field) => field.name);

  return {
    priority: templatePriority,
    // To be completed with the correct index patterns
    index_patterns: [templateIndexPattern],
    template: {
      settings: {
        index: {
          // ILM Policy must be added here, for now point to the default global ILM policy name
          lifecycle: {
            name: ilmPolicy ? ilmPolicy : type,
          },
          // What should be our default for the compression?
          codec: 'best_compression',
          // W
          mapping: {
            total_fields: {
              limit: '10000',
            },
          },
          // This is the default from Beats? So far seems to be a good value
          refresh_interval: '5s',
          // Default in the stack now, still good to have it in
          number_of_shards: '1',
          // We are setting 30 because it can be devided by several numbers. Useful when shrinking.
          number_of_routing_shards: '30',
          // All the default fields which should be queried have to be added here.
          // So far we add all keyword and text fields here if there are any, otherwise
          // this setting is skipped.
          ...(defaultFieldNames.length
            ? {
                query: {
                  default_field: defaultFieldNames,
                },
              }
            : {}),
        },
      },
      mappings: {
        // All the dynamic field mappings
        dynamic_templates: [
          // This makes sure all mappings are keywords by default
          {
            strings_as_keyword: {
              mapping: {
                ignore_above: 1024,
                type: 'keyword',
              },
              match_mapping_type: 'string',
            },
          },
        ],
        // As we define fields ahead, we don't need any automatic field detection
        // This makes sure all the fields are mapped to keyword by default to prevent mapping conflicts
        date_detection: false,
        // All the properties we know from the fields.yml file
        properties: mappings.properties,
        _meta,
      },
    },
    data_stream: { hidden },
    composed_of: composedOfTemplates,
    _meta,
  };
}

export const updateCurrentWriteIndices = async (
  esClient: ElasticsearchClient,
  templates: TemplateRef[]
): Promise<void> => {
  if (!templates.length) return;

  const allIndices = await queryDataStreamsFromTemplates(esClient, templates);
  if (!allIndices.length) return;
  return updateAllDataStreams(allIndices, esClient);
};

function isCurrentDataStream(item: CurrentDataStream[] | undefined): item is CurrentDataStream[] {
  return item !== undefined;
}

const queryDataStreamsFromTemplates = async (
  esClient: ElasticsearchClient,
  templates: TemplateRef[]
): Promise<CurrentDataStream[]> => {
  const dataStreamPromises = templates.map((template) => {
    return getDataStreams(esClient, template);
  });
  const dataStreamObjects = await Promise.all(dataStreamPromises);
  return dataStreamObjects.filter(isCurrentDataStream).flat();
};

const getDataStreams = async (
  esClient: ElasticsearchClient,
  template: TemplateRef
): Promise<CurrentDataStream[] | undefined> => {
  const { templateName, indexTemplate } = template;
  const { body } = await esClient.indices.getDataStream({ name: `${templateName}-*` });
  const dataStreams = body.data_streams;
  if (!dataStreams.length) return;
  return dataStreams.map((dataStream: any) => ({
    dataStreamName: dataStream.name,
    indexTemplate,
  }));
};

const updateAllDataStreams = async (
  indexNameWithTemplates: CurrentDataStream[],
  esClient: ElasticsearchClient
): Promise<void> => {
  const updatedataStreamPromises = indexNameWithTemplates.map(
    ({ dataStreamName, indexTemplate }) => {
      return updateExistingDataStream({ dataStreamName, esClient, indexTemplate });
    }
  );
  await Promise.all(updatedataStreamPromises);
};
const updateExistingDataStream = async ({
  dataStreamName,
  esClient,
  indexTemplate,
}: {
  dataStreamName: string;
  esClient: ElasticsearchClient;
  indexTemplate: IndexTemplate;
}) => {
  const { settings, mappings } = indexTemplate.template;

  // for now, remove from object so as not to update stream or data stream properties of the index until type and name
  // are added in https://github.com/elastic/kibana/issues/66551.  namespace value we will continue
  // to skip updating and assume the value in the index mapping is correct
  delete mappings.properties.stream;
  delete mappings.properties.data_stream;

  // try to update the mappings first
  try {
    await esClient.indices.putMapping({
      index: dataStreamName,
      body: mappings,
      // @ts-expect-error @elastic/elasticsearch doesn't declare it on PutMappingRequest
      write_index_only: true,
    });
    // if update fails, rollover data stream
  } catch (err) {
    try {
      const path = `/${dataStreamName}/_rollover`;
      await esClient.transport.request({
        method: 'POST',
        path,
      });
    } catch (error) {
      throw new Error(`cannot rollover data stream ${error}`);
    }
  }
  // update settings after mappings was successful to ensure
  // pointing to the new pipeline is safe
  // for now, only update the pipeline
  if (!settings.index.default_pipeline) return;
  try {
    await esClient.indices.putSettings({
      index: dataStreamName,
      body: { index: { default_pipeline: settings.index.default_pipeline } },
    });
  } catch (err) {
    throw new Error(`could not update index template settings for ${dataStreamName}`);
  }
};
