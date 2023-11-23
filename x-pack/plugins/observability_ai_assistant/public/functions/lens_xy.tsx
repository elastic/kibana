/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import React, { useState } from 'react';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import {
  LensEmbeddableInput,
  LensPublicStart,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import useAsync from 'react-use/lib/useAsync';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
} from '../types';
import type { RegisterFunctionDefinition } from '../../common/types';

function LensXYChart({
  config,
  start,
  end,
  lens,
  dataViews,
}: {
  config: any;
  start: string;
  end: string;
  lens: LensPublicStart;
  dataViews: DataViewsServicePublic;
}) {
  const embeddableInputAsync = useAsync(async () => {
    const formulaAPI = await lens.stateHelperApi();
    const configBuilder = new LensConfigBuilder(formulaAPI.formula, dataViews);
    const { title, ...rest } = config;
    return (await configBuilder.build(
      {
        chartType: 'xy',
        title: title || 'chart',
        ...rest,
      },
      {
        embeddable: true,
        timeRange: {
          from: start,
          to: end,
          type: 'relative',
        },
      }
    )) as LensEmbeddableInput;
  }, [lens]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  if (!embeddableInputAsync.value) {
    return <EuiLoadingSpinner />;
  }

  const embeddableInput: TypedLensByValueInput =
    embeddableInputAsync.value as TypedLensByValueInput;

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
                  lens.navigateToPrefilledEditor(embeddableInput);
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
            {...embeddableInput}
            style={{
              height: 240,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {isSaveModalOpen ? (
        <lens.SaveModalComponent
          initialInput={embeddableInput}
          onClose={() => {
            setIsSaveModalOpen(() => false);
          }}
        />
      ) : null}
    </>
  );
}
export function registerLensXYFunction({
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
                  description:
                    'es|ql (elasticsearch QL) query to use to get data to power this layer',
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
        required: ['start', 'end', 'layers'],
      } as const,
    },
    async () => {
      return {
        content: {},
      };
    },
    ({ arguments: { end, start, ...rest } }) => {
      // if (!argumentstimeField) return;

      return (
        <LensXYChart
          config={rest}
          start={start}
          end={end}
          lens={pluginsStart.lens}
          dataViews={pluginsStart.dataViews}
        />
      );
    }
  );
}
