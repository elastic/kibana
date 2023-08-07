/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { RegisterFunctionDefinition } from '../../common/types';
import type {
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
} from '../types';

enum LensVisualizationType {
  XY = 'lnsnXy',
  Pie = 'lnsPie',
  Heatmap = 'lnsHeatmap',
  Gauge = 'lnsGauge',
  Datatable = 'lnsDatatable',
  Metric = 'lnsgMetric',
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
      description: 'Use this to display Lens visualisations',
      parameters: {
        type: 'object',
        properties: {
          visualization: {
            type: 'object',
            oneOf: [
              {
                properties: {
                  type: {
                    type: 'string',
                    const: LensVisualizationType.XY,
                  },
                },
              },
              {
                properties: {
                  type: {
                    type: 'string',
                    const: LensVisualizationType.Pie,
                  },
                },
              },
              {
                properties: {
                  type: {
                    type: 'string',
                    const: LensVisualizationType.Heatmap,
                  },
                },
              },
              {
                properties: {
                  type: {
                    type: 'string',
                    const: LensVisualizationType.Gauge,
                  },
                },
              },
              {
                properties: {
                  type: {
                    type: 'string',
                    const: LensVisualizationType.Datatable,
                  },
                },
              },
              {
                properties: {
                  type: {
                    type: 'string',
                    const: LensVisualizationType.Metric,
                  },
                },
              },
            ],
            required: ['type'],
          },
          query: {
            type: 'string',
          },
          from: {
            type: 'string',
          },
          to: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
        },
        required: ['visualization', 'from', 'to', 'title'],
      } as const,
    },
    async (_, signal) => {
      return { content: '' };
    },
    ({ arguments: { visualization, from, to, query } }) => {
      const adHocDataView: { id: string; name: string; type: string } = {
        id: 'adhoc-dataview',
        name: 'adhoc-dataview',
        type: 'index-pattern',
      };

      const input: TypedLensByValueInput = {
        id: '',
        attributes: {
          references: [],
          title: '',
          visualizationType: visualization.type,
          description: '',
          state: {
            filters: [],
            query: {
              language: 'kql',
              query: query ?? '',
            },
            visualization: {},
            datasourceStates: {
              formBased: {
                layers: {},
              },
            },
            internalReferences: [adHocDataView],
            adHocDataViews: {
              [adHocDataView.id]: {
                id: adHocDataView.id,
                title: 'my-index-pattern*',
                name: adHocDataView.name,
                type: adHocDataView.type,
                allowNoIndex: true,
              },
            },
          },
        },
      };

      return <pluginsStart.lens.EmbeddableComponent {...input} />;
    }
  );
}
