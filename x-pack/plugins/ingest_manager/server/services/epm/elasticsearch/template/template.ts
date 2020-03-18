/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Field } from '../../fields/field';
import { Dataset, IndexTemplate } from '../../../../types';
import { getDatasetAssetBaseName } from '../index';

interface Properties {
  [key: string]: any;
}
interface Mappings {
  properties: any;
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
  mappings: Mappings,
  pipelineName?: string | undefined
): IndexTemplate {
  const template = getBaseTemplate(type, templateName, mappings);
  if (pipelineName) {
    template.settings.index.default_pipeline = pipelineName;
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
export function generateMappings(fields: Field[]): Mappings {
  const props: Properties = {};
  fields.forEach(field => {
    // If type is not defined, assume keyword
    const type = field.type || 'keyword';

    let fieldProps = getDefaultProperties(field);

    switch (type) {
      case 'group':
        fieldProps = generateMappings(field.fields!);
        break;
      case 'integer':
        fieldProps.type = 'long';
        break;
      case 'scaled_float':
        fieldProps.type = 'scaled_float';
        fieldProps.scaling_factor = field.scaling_factor || DEFAULT_SCALING_FACTOR;
        break;
      case 'text':
        fieldProps.type = 'text';
        if (field.analyzer) {
          fieldProps.analyzer = field.analyzer;
        }
        if (field.search_analyzer) {
          fieldProps.search_analyzer = field.search_analyzer;
        }
        break;
      case 'keyword':
        fieldProps.type = 'keyword';
        if (field.ignore_above) {
          fieldProps.ignore_above = field.ignore_above;
        } else {
          fieldProps.ignore_above = DEFAULT_IGNORE_ABOVE;
        }
        break;
      // TODO move handling of multi_fields here?
      case 'object':
        // TODO improve
        fieldProps.type = 'object';
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

  return { properties: props };
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

function getBaseTemplate(type: string, templateName: string, mappings: Mappings): IndexTemplate {
  return {
    // We need to decide which order we use for the templates
    order: 1,
    // To be completed with the correct index patterns
    index_patterns: [`${templateName}-*`],
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
      // To be filled with interesting information about this specific index
      _meta: {
        package: 'foo',
      },
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
  };
}
