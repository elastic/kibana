/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Field, Fields } from '../../fields/field';
import {
  RegistryDataStream,
  CallESAsCurrentUser,
  TemplateRef,
  IndexTemplate,
  IndexTemplateMappings,
  DataType,
} from '../../../../types';
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
export interface CurrentIndex {
  indexName: string;
  indexTemplate: IndexTemplate;
}
const DEFAULT_SCALING_FACTOR = 1000;
const DEFAULT_IGNORE_ABOVE = 1024;

/**
 * getTemplate retrieves the default template but overwrites the index pattern with the given value.
 *
 * @param indexPattern String with the index pattern
 */
export function getTemplate({
  type,
  templateName,
  mappings,
  pipelineName,
  packageName,
  composedOfTemplates,
  ilmPolicy,
  hidden,
}: {
  type: string;
  templateName: string;
  mappings: IndexTemplateMappings;
  pipelineName?: string | undefined;
  packageName: string;
  composedOfTemplates: string[];
  ilmPolicy?: string | undefined;
  hidden?: boolean;
}): IndexTemplate {
  const template = getBaseTemplate(
    type,
    templateName,
    mappings,
    packageName,
    composedOfTemplates,
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
    patterns[dataStream.path] = generateTemplateName(dataStream) + '-*';
  }
  return patterns;
}

function getBaseTemplate(
  type: string,
  templateName: string,
  mappings: IndexTemplateMappings,
  packageName: string,
  composedOfTemplates: string[],
  ilmPolicy?: string | undefined,
  hidden?: boolean
): IndexTemplate {
  // Meta information to identify Ingest Manager's managed templates and indices
  const _meta = {
    package: {
      name: packageName,
    },
    managed_by: 'ingest-manager',
    managed: true,
  };

  return {
    // This takes precedence over all index templates installed by ES by default (logs-*-* and metrics-*-*)
    // if this number is lower than the ES value (which is 100) this template will never be applied when a data stream
    // is created. I'm using 200 here to give some room for users to create their own template and fit it between the
    // default and the one the ingest manager uses.
    priority: 200,
    // To be completed with the correct index patterns
    index_patterns: [`${templateName}-*`],
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
          // All the default fields which should be queried have to be added here.
          // So far we add all keyword and text fields here.
          query: {
            default_field: ['message'],
          },
          // We are setting 30 because it can be devided by several numbers. Useful when shrinking.
          number_of_routing_shards: '30',
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
  callCluster: CallESAsCurrentUser,
  templates: TemplateRef[]
): Promise<void> => {
  if (!templates.length) return;

  const allIndices = await queryIndicesFromTemplates(callCluster, templates);
  if (!allIndices.length) return;
  return updateAllIndices(allIndices, callCluster);
};

function isCurrentIndex(item: CurrentIndex[] | undefined): item is CurrentIndex[] {
  return item !== undefined;
}

const queryIndicesFromTemplates = async (
  callCluster: CallESAsCurrentUser,
  templates: TemplateRef[]
): Promise<CurrentIndex[]> => {
  const indexPromises = templates.map((template) => {
    return getIndices(callCluster, template);
  });
  const indexObjects = await Promise.all(indexPromises);
  return indexObjects.filter(isCurrentIndex).flat();
};

const getIndices = async (
  callCluster: CallESAsCurrentUser,
  template: TemplateRef
): Promise<CurrentIndex[] | undefined> => {
  const { templateName, indexTemplate } = template;
  // Until ES provides a way to update mappings of a data stream
  // get the last index of the data stream, which is the current write index
  const res = await callCluster('transport.request', {
    method: 'GET',
    path: `/_data_stream/${templateName}-*`,
  });
  const dataStreams = res.data_streams;
  if (!dataStreams.length) return;
  return dataStreams.map((dataStream: any) => ({
    indexName: dataStream.indices[dataStream.indices.length - 1].index_name,
    indexTemplate,
  }));
};

const updateAllIndices = async (
  indexNameWithTemplates: CurrentIndex[],
  callCluster: CallESAsCurrentUser
): Promise<void> => {
  const updateIndexPromises = indexNameWithTemplates.map(({ indexName, indexTemplate }) => {
    return updateExistingIndex({ indexName, callCluster, indexTemplate });
  });
  await Promise.all(updateIndexPromises);
};
const updateExistingIndex = async ({
  indexName,
  callCluster,
  indexTemplate,
}: {
  indexName: string;
  callCluster: CallESAsCurrentUser;
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
    await callCluster('indices.putMapping', {
      index: indexName,
      body: mappings,
    });
    // if update fails, rollover data stream
  } catch (err) {
    try {
      // get the data_stream values to compose datastream name
      const searchDataStreamFieldsResponse = await callCluster('search', {
        index: indexTemplate.index_patterns[0],
        body: {
          size: 1,
          _source: ['data_stream.namespace', 'data_stream.type', 'data_stream.dataset'],
          query: {
            bool: {
              filter: [
                {
                  exists: {
                    field: 'data_stream.type',
                  },
                },
                {
                  exists: {
                    field: 'data_stream.dataset',
                  },
                },
                {
                  exists: {
                    field: 'data_stream.namespace',
                  },
                },
              ],
            },
          },
        },
      });
      if (searchDataStreamFieldsResponse.hits.total.value === 0)
        throw new Error('data_stream fields are missing from datastream indices');
      const {
        dataset,
        namespace,
        type,
      }: {
        dataset: string;
        namespace: string;
        type: DataType;
      } = searchDataStreamFieldsResponse.hits.hits[0]._source.data_stream;
      const dataStreamName = `${type}-${dataset}-${namespace}`;
      const path = `/${dataStreamName}/_rollover`;
      await callCluster('transport.request', {
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
    await callCluster('indices.putSettings', {
      index: indexName,
      body: { index: { default_pipeline: settings.index.default_pipeline } },
    });
  } catch (err) {
    throw new Error(`could not update index template settings for ${indexName}`);
  }
};
