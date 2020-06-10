/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Field, Fields } from '../../fields/field';
import {
  Dataset,
  CallESAsCurrentUser,
  TemplateRef,
  IndexTemplate,
  IndexTemplateMappings,
} from '../../../../types';
import { getDatasetAssetBaseName } from '../index';

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
export function getTemplate(
  type: string,
  templateName: string,
  mappings: IndexTemplateMappings,
  pipelineName?: string | undefined
): IndexTemplate {
  const template = getBaseTemplate(type, templateName, mappings);
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
export function generateTemplateName(dataset: Dataset): string {
  return getDatasetAssetBaseName(dataset);
}

/**
 * Returns a map of the dataset path fields to elasticsearch index pattern.
 * @param datasets an array of Dataset objects
 */
export function generateESIndexPatterns(datasets: Dataset[] | undefined): Record<string, string> {
  if (!datasets) {
    return {};
  }

  const patterns: Record<string, string> = {};
  for (const dataset of datasets) {
    patterns[dataset.path] = generateTemplateName(dataset) + '-*';
  }
  return patterns;
}

function getBaseTemplate(
  type: string,
  templateName: string,
  mappings: IndexTemplateMappings
): IndexTemplate {
  return {
    // This takes precedence over all index templates installed with the 'base' package
    priority: 1,
    // To be completed with the correct index patterns
    index_patterns: [`${templateName}-*`],
    template: {
      settings: {
        index: {
          // ILM Policy must be added here, for now point to the default global ILM policy name
          lifecycle: {
            name: `${type}-default`,
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
      },
      // To be filled with the aliases that we need
      aliases: {},
    },
    data_stream: {
      timestamp_field: '@timestamp',
    },
  };
}

export const updateCurrentWriteIndices = async (
  callCluster: CallESAsCurrentUser,
  templates: TemplateRef[]
): Promise<void> => {
  if (!templates) return;

  const allIndices = await queryIndicesFromTemplates(callCluster, templates);
  return updateAllIndices(allIndices, callCluster);
};

const queryIndicesFromTemplates = async (
  callCluster: CallESAsCurrentUser,
  templates: TemplateRef[]
): Promise<CurrentIndex[]> => {
  const indexPromises = templates.map((template) => {
    return getIndices(callCluster, template);
  });
  const indexObjects = await Promise.all(indexPromises);
  return indexObjects.filter((item) => item !== undefined).flat();
};

const getIndices = async (
  callCluster: CallESAsCurrentUser,
  template: TemplateRef
): Promise<CurrentIndex[] | undefined> => {
  const { templateName, indexTemplate } = template;
  const res = await callCluster('search', getIndexQuery(templateName));
  const indices: any[] = res?.aggregations?.index.buckets;
  if (indices) {
    return indices.map((index) => ({
      indexName: index.key,
      indexTemplate,
    }));
  }
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
  // try to update the mappings first
  // for now we assume updates are compatible
  try {
    await callCluster('indices.putMapping', {
      index: indexName,
      body: mappings,
    });
  } catch (err) {
    throw new Error('incompatible mappings update');
  }
  // update settings after mappings was successful to ensure
  // pointing to theme new pipeline is safe
  // for now, only update the pipeline
  if (!settings.index.default_pipeline) return;
  try {
    await callCluster('indices.putSettings', {
      index: indexName,
      body: { index: { default_pipeline: settings.index.default_pipeline } },
    });
  } catch (err) {
    throw new Error('incompatible settings update');
  }
};

const getIndexQuery = (templateName: string) => ({
  index: `${templateName}-*`,
  size: 0,
  body: {
    query: {
      bool: {
        must: [
          {
            exists: {
              field: 'dataset.namespace',
            },
          },
          {
            exists: {
              field: 'dataset.name',
            },
          },
        ],
      },
    },
    aggs: {
      index: {
        terms: {
          field: '_index',
        },
      },
    },
  },
});
