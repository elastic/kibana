/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import { LensAttributesBuilder, XYChart, XYDataLayer } from '@kbn/lens-embeddable-utils';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { RegisterFunctionDefinition } from '../../common/types';
import { useKibana } from '../hooks/use_kibana';
import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
} from '../types';

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

function Lens({
  indexPattern,
  xyDataLayer,
  start,
  end,
}: {
  indexPattern: string;
  xyDataLayer: XYDataLayer;
  start: string;
  end: string;
}) {
  const {
    services: {
      plugins: {
        start: { lens, dataViews },
      },
    },
  } = useKibana();

  const formulaAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const dataViewAsync = useAsync(() => {
    return dataViews.create({
      id: indexPattern,
      title: indexPattern,
      timeFieldName: '@timestamp',
    });
  }, [indexPattern]);

  if (!formulaAsync.value || !dataViewAsync.value) {
    return <EuiLoadingSpinner />;
  }

  const attributes = new LensAttributesBuilder({
    visualization: new XYChart({
      layers: [xyDataLayer],
      formulaAPI: formulaAsync.value.formula,
      dataView: dataViewAsync.value,
    }),
  }).build();

  return (
    <lens.EmbeddableComponent
      id={indexPattern}
      attributes={attributes}
      timeRange={{
        from: start,
        to: end,
        mode: 'relative',
      }}
      style={{
        height: 240,
      }}
    />
  );
}

export function registerLensFunction({
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
      name: 'lens',
      contexts: ['core'],
      description:
        'Use this function to create custom visualisations, using Lens, that can be saved to dashboards. When using this function, make sure to use the recall function to get more information about how to use it, with how you want to use it.',
      descriptionForUser:
        'Use this function to create custom visualisations, using Lens, that can be saved to dashboards.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          layers: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                label: {
                  type: 'string',
                },
                value: {
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
                  additionalProperties: false,
                  properties: {
                    id: {
                      type: 'string',
                      description:
                        'How to format the value. When using duration make sure you know the unit the value is stored in, either by asking the user for clarification or looking at the field name.',
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
              required: ['label', 'value', 'format'],
            },
          },
          breakdown: {
            type: 'object',
            additionalProperties: false,
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
        required: ['layers', 'indexPattern', 'start', 'end'],
      } as const,
    },
    async () => {
      return {
        content: {},
      };
    },
    ({ arguments: { layers, indexPattern, breakdown, seriesType, start, end } }) => {
      const xyDataLayer = new XYDataLayer({
        data: layers.map((layer) => ({
          type: 'formula',
          value: layer.value,
          label: layer.label,
          format: layer.format,
          filter: {
            language: 'kql',
            query: layer.filter ?? '',
          },
        })),
        options: {
          seriesType,
          breakdown: breakdown
            ? { type: 'top_values', params: { size: 10 }, field: breakdown.field }
            : undefined,
        },
      });

      return <Lens indexPattern={indexPattern} xyDataLayer={xyDataLayer} start={start} end={end} />;
    }
  );
}
