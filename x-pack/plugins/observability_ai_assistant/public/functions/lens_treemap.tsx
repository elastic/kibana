/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import React from 'react';
import type { RegisterFunctionDefinition } from '../../common/types';
import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
} from '../types';
import { LensChart } from './lens_chart';

export function registerLensTreemapFunction({
  service,
  registerFunction,
  pluginsStart,
}: {
  service: ObservabilityAIAssistantService;
  registerFunction: RegisterFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantPluginStartDependencies;
}) {
  registerFunction(
    {
      name: 'lens_treemap',
      contexts: ['core'],
      description:
        "Use this function to create custom treemap visualizations, using Lens, that can be saved to dashboards. This function does not return data to the assistant, it only shows it to the user. When using this function, make sure to use the recall function to get more information about how to use it, with how you want to use it. Make sure the query also contains information about the user's request. The visualisation is displayed to the user above your reply, DO NOT try to generate or display an image yourself.",
      descriptionForUser:
        'Use this function to create custom treemap visualizations, using Lens, that can be saved to dashboards.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: {
            type: 'string',
          },
          chartType: {
            type: 'string',
            enum: ['treemap', 'pie', 'donut', 'mosaic'],
            default: 'treemap',
          },
          esql: {
            type: 'string',
            description: 'es|ql (elasticsearch QL) query to use to get data to power the chart',
          },
          value: {
            type: 'string',
            description: 'field name to use as a value.',
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
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'fields to use as a breakdown',
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
        required: ['dataset', 'start', 'end', 'value', 'breakdown'],
      } as const,
    },
    async () => {
      return {
        content: {},
      };
    },
    ({ arguments: { end, start, chartType, esql, ...rest } }) => {
      return (
        <LensChart
          chartType={chartType!}
          layerConfig={{
            ...rest,
            dataset: { esql },
          }}
          start={start}
          end={end}
          lens={pluginsStart.lens}
          dataViews={pluginsStart.dataViews}
        />
      );
    }
  );
}
