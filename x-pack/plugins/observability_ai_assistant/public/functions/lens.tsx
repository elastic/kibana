/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { LensAttributesBuilder, XYChart, XYDataLayer } from '@kbn/lens-embeddable-utils';
import type { LensEmbeddableInput, LensPublicStart } from '@kbn/lens-plugin/public';
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
  xyDataLayer,
  start,
  end,
  lens,
  dataViews,
}: {
  indexPattern: string;
  xyDataLayer: XYDataLayer;
  start: string;
  end: string;
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
}) {
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

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

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
                data-test-subj="observabilityAiAssistantLensOpenInLensButton"
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
                data-test-subj="observabilityAiAssistantLensSaveButton"
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
          value: layer.formula,
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

      return (
        <Lens
          indexPattern={indexPattern}
          xyDataLayer={xyDataLayer}
          start={start}
          end={end}
          lens={pluginsStart.lens}
          dataViews={pluginsStart.dataViews}
        />
      );
    }
  );
}
