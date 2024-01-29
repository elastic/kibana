/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { FromSchema } from 'json-schema-to-ts';

export const lensXYFunctionDefinition = {
  name: 'lens_xy',
  contexts: ['core'],
  description:
    "Use this function to create custom xy visualizations, using Lens, that can be saved to dashboards. This function does not return data to the assistant, it only shows it to the user. When using this function, make sure to use the recall function to get more information about how to use it, with how you want to use it. Make sure the query also contains information about the user's request. The visualisation is displayed to the user above your reply, DO NOT try to generate or display an image yourself.",
  descriptionForUser:
    'Use this function to create custom xy visualizations, using Lens, that can be saved to dashboards.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: {
        type: 'string',
      },
      esql: {
        type: 'string',
        description: 'es|ql (elasticsearch QL) query to use to get data to power the chart',
      },
      layers: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            type: {
              type: 'string',
              enum: ['series', 'annotation', 'reference'],
              default: 'series',
            },
            esql: {
              type: 'string',
              description: 'es|ql (elasticsearch QL) query to use to get data to power this layer',
            },
            value: {
              type: 'string',
              description: 'field name to use for value',
            },
            filter: {
              type: 'string',
              description: 'A KQL query that will be used as a filter for the series',
            },
            format: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: {
                  type: 'string',
                  description:
                    'How to format the value. When using duration, make sure the value is seconds OR is converted to seconds using math functions. Ask the user for clarification in which unit the value is stored, or derive it from the field name.',
                  enum: [
                    FIELD_FORMAT_IDS.BYTES,
                    FIELD_FORMAT_IDS.CURRENCY,
                    FIELD_FORMAT_IDS.DURATION,
                    FIELD_FORMAT_IDS.NUMBER,
                    FIELD_FORMAT_IDS.PERCENT,
                    FIELD_FORMAT_IDS.STRING,
                  ],
                },
              },
              required: ['id'],
            },
            breakdown: {
              type: 'string',
              description: 'field to use as a breakdown',
            },
            xAxis: {
              type: 'string',
              description: 'time field to use on x axis',
            },
            seriesType: {
              type: 'string',
              enum: ['line', 'bar', 'area'],
            },
            fill: {
              type: 'string',
              enum: ['none', 'below', 'above'],
              description: 'this setting only applies to layers of type "reference"',
            },
            events: {
              type: 'array',
              description: 'this setting should only be set on layers of type "annotation"',
              items: {
                type: 'object',
                additionalProperties: false,
                description:
                  'for static events set datetime property, for dynamic events set field and filter',
                properties: {
                  name: {
                    type: 'string',
                  },
                  datetime: {
                    type: 'string',
                    description: 'datetime of this event',
                  },
                  field: {
                    type: 'string',
                  },
                  filter: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      start: {
        type: 'string',
        description: 'The start of the time range, in Elasticsearch datemath',
      },
      end: {
        type: 'string',
        description: 'The end of the time range, in Elasticsearch datemath',
      },
    },
    required: ['start', 'end', 'layers', 'esql'],
  } as const,
};

export type LensXYFunctionArguments = FromSchema<typeof lensXYFunctionDefinition['parameters']>;
