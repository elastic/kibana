/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FromSchema } from 'json-schema-to-ts';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { FunctionVisibility } from '@kbn/observability-ai-assistant-plugin/common';

export enum SeriesType {
  Bar = 'bar',
  Line = 'line',
  Area = 'area',
  BarStacked = 'bar_stacked',
  AreaStacked = 'area_stacked',
  BarHorizontal = 'bar_horizontal',
  BarPercentageStacked = 'bar_percentage_stacked',
  AreaPercentageStacked = 'area_percentage_stacked',
  BarHorizontalPercentageStacked = 'bar_horizontal_percentage_stacked',
}

export const lensFunctionDefinition = {
  name: 'lens',
  contexts: ['core'],
  // function is deprecated
  visibility: FunctionVisibility.Internal,
  description:
    "Use this function to create custom visualizations, using Lens, that can be saved to dashboards. This function does not return data to the assistant, it only shows it to the user. When using this function, make sure to use the context function to get more information about how to use it, with how you want to use it. Make sure the query also contains information about the user's request. The visualisation is displayed to the user above your reply, DO NOT try to generate or display an image yourself.",
  descriptionForUser:
    'Use this function to create custom visualizations, using Lens, that can be saved to dashboards.',
  parameters: {
    type: 'object',
    properties: {
      layers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: {
              type: 'string',
            },
            formula: {
              type: 'string',
              description:
                'The formula for calculating the value, e.g. sum(my_field_name). Query the knowledge base to get more information about the syntax and available formulas.',
            },
            filter: {
              type: 'string',
              description: 'A KQL query that will be used as a filter for the series',
            },
            format: {
              type: 'object',
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
          },
          required: ['label', 'formula', 'format'],
        },
      },
      timeField: {
        type: 'string',
        default: '@timefield',
        description:
          'time field to use for XY chart. Use @timefield if its available on the index.',
      },
      breakdown: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
          },
        },
        required: ['field'],
      },
      indexPattern: {
        type: 'string',
      },
      seriesType: {
        type: 'string',
        enum: [
          SeriesType.Area,
          SeriesType.AreaPercentageStacked,
          SeriesType.AreaStacked,
          SeriesType.Bar,
          SeriesType.BarHorizontal,
          SeriesType.BarHorizontalPercentageStacked,
          SeriesType.BarPercentageStacked,
          SeriesType.BarStacked,
          SeriesType.Line,
        ],
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
    required: ['layers', 'indexPattern', 'start', 'end', 'timeField'],
  } as const,
};

export type LensFunctionArguments = FromSchema<typeof lensFunctionDefinition['parameters']>;
