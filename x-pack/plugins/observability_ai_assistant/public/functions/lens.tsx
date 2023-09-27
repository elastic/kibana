/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import {
  LensAttributesBuilder,
  XYChart,
  XYDataLayer,
  MetricChart,
  MetricLayer,
  PieChart,
  HeatmapChart,
  PieLayer,
  HeatmapLayer,
} from '@kbn/lens-embeddable-utils';
import type {
  LegendConfigResult,
  LensEmbeddableInput,
  LensPublicStart,
} from '@kbn/lens-plugin/public';
import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { i18n } from '@kbn/i18n';
import { Assign } from 'utility-types';
import type { RegisterFunctionDefinition } from '../../common/types';
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
  layers,
  timeField,
  breakdown,
  start,
  end,
  lens,
  legend,
  chartType,
  dataViews,
}: {
  indexPattern: string;
  xyDataLayer: XYDataLayer;
  start: string;
  end: string;
  legend?: LegendConfigResult;
  chartType?: string;
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
  layers: [any];
  timeField?: string;
  breakdown?: string;
}) {
  const formulaAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  const dataViewAsync = useAsync(() => {
    return (
      dataViews.get(indexPattern) ||
      dataViews.find(indexPattern).then((dataviews) => {
        if (dataviews.length === 1) return dataviews[0];
        return;
      }) ||
      dataViews.create({
        id: indexPattern,
        title: indexPattern,
        timeFieldName: '@timestamp',
      })
    );
  }, [indexPattern]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  if (!formulaAsync.value || !dataViewAsync.value) {
    return <EuiLoadingSpinner />;
  }

  const createVisualization = () => {
    const layer = layers[0];
    switch (chartType) {
      default:
        const xyDataLayer = new XYDataLayer({
          data: layers.map((l) => ({
            type: 'formula',
            value: l.formula,
            label: l.label,
            format: l.format,
            seriesType: l.seriesType,
            showGridLines: l.showGridLines,
            filter: {
              language: 'kql',
              query: l.filter ?? '',
            },
          })),
          options: {
            buckets: timeField ? { type: 'date_histogram', field: timeField } : undefined,
            breakdown: breakdown
              ? { type: 'top_values', params: { size: 10 }, field: breakdown }
              : undefined,
          },
        });

        return new XYChart({
          visualOptions: {
            legend,
          },
          layers: [xyDataLayer],
          formulaAPI: formulaAsync.value!.formula,
          dataView: dataViewAsync.value!,
        });
      case 'metric':
        const metricLayer = new MetricLayer({
          data: {
            value: layer.formula,
            label: layer.label,
            format: layer.format,
            filter: {
              language: 'kql',
              query: layer.filter ?? '',
            },
          },
          options: {
            showTitle: true,
          },
        });

        return new MetricChart({
          layers: metricLayer,
          formulaAPI: formulaAsync.value!.formula,
          dataView: dataViewAsync.value!,
        });
      case 'pie':
        const pieLayer = new PieLayer({
          data: layers.map((l) => ({
            value: layer.formula,
            label: layer.label,
            format: layer.format,
            filter: {
              language: 'kql',
              query: layer.filter ?? '',
            },
          })),
          options: {
            breakdown: { type: 'top_values', params: { size: 10 }, field: breakdown! },
          },
        });

        return new PieChart({
          layers: [pieLayer],
          formulaAPI: formulaAsync.value!.formula,
          dataView: dataViewAsync.value!,
        });
      case 'heatmap':
        const heatmapLayer = new HeatmapLayer({
          data: {
            value: layer.formula,
            label: layer.label,
            format: layer.format,
            filter: {
              language: 'kql',
              query: layer.filter ?? '',
            },
          },
          options: {
            breakdown_x: { type: 'top_values', params: { size: 10 }, field: timeField! },
            breakdown_y: { type: 'top_values', params: { size: 10 }, field: breakdown! },
          },
        });

        return new HeatmapChart({
          layers: heatmapLayer,
          formulaAPI: formulaAsync.value!.formula,
          dataView: dataViewAsync.value!,
        });
    }
  };

  const visualization = createVisualization();

  const attributes = new LensAttributesBuilder({
    visualization,
  }).build();

  const lensEmbeddableInput: Assign<LensEmbeddableInput, { attributes: typeof attributes }> = {
    id: indexPattern,
    attributes,
    timeRange: {
      from: start,
      to: end,
      mode: 'relative' as const,
    },
  };

  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="lensApp"
                onClick={() => {
                  lens.navigateToPrefilledEditor(lensEmbeddableInput);
                }}
              >
                {i18n.translate('xpack.observabilityAiAssistant.lensFunction.openInLens', {
                  defaultMessage: 'Open in Lens',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                iconType="save"
                onClick={() => {
                  setIsSaveModalOpen(() => true);
                }}
              >
                {i18n.translate('xpack.observabilityAiAssistant.lensFunction.save', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <lens.EmbeddableComponent
            {...lensEmbeddableInput}
            style={{
              height: 240,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isSaveModalOpen ? (
        <lens.SaveModalComponent
          initialInput={lensEmbeddableInput}
          onClose={() => {
            setIsSaveModalOpen(() => false);
          }}
        />
      ) : null}
    </>
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
        "Use this function to create custom visualizations, using Lens, that can be saved to dashboards. This function does not return data to the assistant, it only shows it to the user. When using this function, make sure to use the recall function to get more information about how to use it, with how you want to use it. Make sure the query also contains information about the user's request. The visualisation is displayed to the user above your reply, DO NOT try to generate or display an image yourself.",
      descriptionForUser:
        'Use this function to create custom visualizations, using Lens, that can be saved to dashboards.',
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
                seriesType: {
                  type: 'string',
                  description:
                    'this option is only valid for XY chart type. It is very important, that you do NOT set this property for other chart types like pie, heatmap or metric.',
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
                showGridLines: {
                  type: 'boolean',
                },
              },
              required: ['label', 'formula', 'format'],
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
            description:
              'this is required setting for pie chart and optional for other charts. For heatmap chart it defines breakdown on the Y axis.',
            required: ['field'],
          },
          legend: {
            type: 'object',
            additionalProperties: false,
            properties: {
              visibility: {
                type: 'boolean',
              },
              position: {
                type: 'string',
                enum: ['left', 'right', 'bottom', 'top'],
              },
            },
          },
          indexPattern: {
            type: 'string',
          },
          timeField: {
            type: 'string',
            description:
              'time field to use on the x axis if XY chart is used or string field to use on x axis if heatmap chart is used. For other chart types this option should not be set.',
          },
          start: {
            type: 'string',
            description: 'The start of the time range, in Elasticsearch datemath',
          },
          end: {
            type: 'string',
            description: 'The end of the time range, in Elasticsearch datemath',
          },
          chartType: {
            type: 'string',
            description: 'chart type to render, if not set XY chart is assumed',
            enum: ['XY', 'heatmap', 'pie', 'metric'],
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
    ({
      arguments: { layers, indexPattern, breakdown, timeField, legend, start, end, chartType },
    }) => {
      return (
        <Lens
          indexPattern={indexPattern}
          layers={layers}
          breakdown={breakdown ? breakdown.field : undefined}
          timeField={timeField}
          start={start}
          end={end}
          lens={pluginsStart.lens}
          dataViews={pluginsStart.dataViews}
          legend={legend}
          chartType={chartType}
        />
      );
    }
  );
}
