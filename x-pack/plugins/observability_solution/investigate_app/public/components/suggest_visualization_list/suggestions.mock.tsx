/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Suggestion } from '@kbn/lens-plugin/public';

export const tableSuggestion: Suggestion = {
  title:
    'Table @timestamp & agent.activation_method & agent.ephemeral_id & agent.name & agent.version',
  score: 0.2,
  hide: true,
  visualizationId: 'lnsDatatable',
  previewIcon: 'visTable',
  visualizationState: {
    layerId: '5594a808-654b-4170-825d-26c58069bb27',
    layerType: 'data',
    columns: [
      {
        columnId: '@timestamp',
      },
      {
        columnId: 'agent.activation_method',
      },
      {
        columnId: 'agent.ephemeral_id',
      },
      {
        columnId: 'agent.name',
      },
      {
        columnId: 'agent.version',
      },
    ],
  },
  keptLayerIds: ['5594a808-654b-4170-825d-26c58069bb27'],
  datasourceState: {
    layers: {
      '5594a808-654b-4170-825d-26c58069bb27': {
        index: '6176e654c875b9d3d9a3a69414fa44c561964cbb174a1f64f69e34eced7debac',
        query: {
          esql: 'FROM logs-apm.error-default',
        },
        columns: [
          {
            columnId: '@timestamp',
            fieldName: '@timestamp',
            meta: {
              type: 'date',
            },
            inMetricDimension: true,
          },
          {
            columnId: 'agent.activation_method',
            fieldName: 'agent.activation_method',
            meta: {
              type: 'string',
            },
            inMetricDimension: true,
          },
          {
            columnId: 'agent.ephemeral_id',
            fieldName: 'agent.ephemeral_id',
            meta: {
              type: 'string',
            },
            inMetricDimension: true,
          },
          {
            columnId: 'agent.name',
            fieldName: 'agent.name',
            meta: {
              type: 'string',
            },
            inMetricDimension: true,
          },
          {
            columnId: 'agent.version',
            fieldName: 'agent.version',
            meta: {
              type: 'string',
            },
            inMetricDimension: true,
          },
        ],
      },
    },
    indexPatternRefs: [
      {
        id: '6176e654c875b9d3d9a3a69414fa44c561964cbb174a1f64f69e34eced7debac',
        title: 'logs-apm.error-default',
      },
    ],
  },
  datasourceId: 'textBased',
  columns: 5,
  changeType: 'initial',
};

export const metricSuggestion: Suggestion = {
  title: 'Metric',
  score: 0.51,
  hide: true,
  visualizationId: 'lnsMetric',
  previewIcon: 'visMetric',
  visualizationState: {
    layerId: 'ecd36789-1acb-4278-b087-2e46cf459f89',
    layerType: 'data',
    metricAccessor: 'COUNT(*)',
  },
  keptLayerIds: ['ecd36789-1acb-4278-b087-2e46cf459f89'],
  datasourceState: {
    layers: {
      'ecd36789-1acb-4278-b087-2e46cf459f89': {
        index: '6176e654c875b9d3d9a3a69414fa44c561964cbb174a1f64f69e34eced7debac',
        query: {
          esql: 'FROM logs-apm.error-default | STATS COUNT(*)',
        },
        columns: [
          {
            columnId: 'COUNT(*)',
            fieldName: 'COUNT(*)',
            meta: {
              type: 'number',
            },
            inMetricDimension: true,
          },
        ],
      },
    },
    indexPatternRefs: [
      {
        id: '6176e654c875b9d3d9a3a69414fa44c561964cbb174a1f64f69e34eced7debac',
        title: 'logs-apm.error-default',
      },
    ],
  },
  datasourceId: 'textBased',
  columns: 1,
  changeType: 'initial',
};

export const barSuggestion: Suggestion = {
  title: 'Bar vertical stacked',
  score: 0.16666666666666666,
  hide: false,
  incomplete: false,
  visualizationId: 'lnsXY',
  previewIcon: 'visBarVerticalStacked',
  visualizationState: {
    legend: {
      isVisible: true,
      position: 'right',
    },
    valueLabels: 'hide',
    fittingFunction: 'None',
    axisTitlesVisibilitySettings: {
      x: true,
      yLeft: true,
      yRight: true,
    },
    tickLabelsVisibilitySettings: {
      x: true,
      yLeft: true,
      yRight: true,
    },
    labelsOrientation: {
      x: 0,
      yLeft: 0,
      yRight: 0,
    },
    gridlinesVisibilitySettings: {
      x: true,
      yLeft: true,
      yRight: true,
    },
    preferredSeriesType: 'bar_stacked',
    layers: [
      {
        layerId: '6aeee1c5-c080-4c22-8548-c887a213a433',
        seriesType: 'bar_stacked',
        xAccessor: 'BUCKET(@timestamp, 1 minute)',
        accessors: ['COUNT(*)'],
        layerType: 'data',
        colorMapping: {
          assignments: [],
          specialAssignments: [
            {
              rule: {
                type: 'other',
              },
              color: {
                type: 'loop',
              },
              touched: false,
            },
          ],
          paletteId: 'eui_amsterdam_color_blind',
          colorMode: {
            type: 'categorical',
          },
        },
      },
    ],
  },
  keptLayerIds: ['6aeee1c5-c080-4c22-8548-c887a213a433'],
  datasourceState: {
    layers: {
      '6aeee1c5-c080-4c22-8548-c887a213a433': {
        index: '6176e654c875b9d3d9a3a69414fa44c561964cbb174a1f64f69e34eced7debac',
        query: {
          esql: 'FROM logs-apm.error-default | WHERE @timestamp >= NOW() - 15 minutes | STATS COUNT(*) BY BUCKET(@timestamp, 1 minute)',
        },
        columns: [
          {
            columnId: 'COUNT(*)',
            fieldName: 'COUNT(*)',
            meta: {
              type: 'number',
            },
            inMetricDimension: true,
          },
          {
            columnId: 'BUCKET(@timestamp, 1 minute)',
            fieldName: 'BUCKET(@timestamp, 1 minute)',
            meta: {
              type: 'date',
            },
          },
        ],
      },
    },
    indexPatternRefs: [
      {
        id: '6176e654c875b9d3d9a3a69414fa44c561964cbb174a1f64f69e34eced7debac',
        title: 'logs-apm.error-default',
      },
    ],
  },
  datasourceId: 'textBased',
  columns: 2,
  changeType: 'unchanged',
};

export const treemapSuggestion: Suggestion = {
  title: 'Treemap',
  score: 0.56,
  hide: false,
  incomplete: false,
  visualizationId: 'lnsPie',
  previewIcon: 'namespace',
  visualizationState: {
    shape: 'treemap',
    layers: [
      {
        layerId: '6aeee1c5-c080-4c22-8548-c887a213a433',
        primaryGroups: ['BUCKET(@timestamp, 1 minute)'],
        metrics: ['COUNT(*)'],
        numberDisplay: 'percent',
        categoryDisplay: 'default',
        legendDisplay: 'default',
        nestedLegend: false,
        layerType: 'data',
      },
    ],
  },
  keptLayerIds: ['6aeee1c5-c080-4c22-8548-c887a213a433'],
  datasourceState: {
    layers: {
      '6aeee1c5-c080-4c22-8548-c887a213a433': {
        index: '6176e654c875b9d3d9a3a69414fa44c561964cbb174a1f64f69e34eced7debac',
        query: {
          esql: 'FROM logs-apm.error-default | WHERE @timestamp >= NOW() - 15 minutes | STATS COUNT(*) BY BUCKET(@timestamp, 1 minute)',
        },
        columns: [
          {
            columnId: 'COUNT(*)',
            fieldName: 'COUNT(*)',
            meta: {
              type: 'number',
            },
            inMetricDimension: true,
          },
          {
            columnId: 'BUCKET(@timestamp, 1 minute)',
            fieldName: 'BUCKET(@timestamp, 1 minute)',
            meta: {
              type: 'date',
            },
          },
        ],
      },
    },
    indexPatternRefs: [
      {
        id: '6176e654c875b9d3d9a3a69414fa44c561964cbb174a1f64f69e34eced7debac',
        title: 'logs-apm.error-default',
      },
    ],
  },
  datasourceId: 'textBased',
  columns: 2,
  changeType: 'initial',
};

export const donutSuggestion: Suggestion = {
  title: 'Donut',
  score: 0.46,
  hide: false,
  incomplete: false,
  visualizationId: 'lnsPie',
  previewIcon: 'help',
  visualizationState: {
    shape: 'donut',
    layers: [
      {
        layerId: '6aeee1c5-c080-4c22-8548-c887a213a433',
        primaryGroups: ['BUCKET(@timestamp, 1 minute)'],
        metrics: ['COUNT(*)'],
        numberDisplay: 'percent',
        categoryDisplay: 'default',
        legendDisplay: 'default',
        nestedLegend: false,
        layerType: 'data',
        colorMapping: {
          assignments: [],
          specialAssignments: [
            {
              rule: {
                type: 'other',
              },
              color: {
                type: 'loop',
              },
              touched: false,
            },
          ],
          paletteId: 'eui_amsterdam_color_blind',
          colorMode: {
            type: 'categorical',
          },
        },
      },
    ],
  },
  keptLayerIds: ['6aeee1c5-c080-4c22-8548-c887a213a433'],
  datasourceState: {
    layers: {
      '6aeee1c5-c080-4c22-8548-c887a213a433': {
        index: '6176e654c875b9d3d9a3a69414fa44c561964cbb174a1f64f69e34eced7debac',
        query: {
          esql: 'FROM logs-apm.error-default | WHERE @timestamp >= NOW() - 15 minutes | STATS COUNT(*) BY BUCKET(@timestamp, 1 minute)',
        },
        columns: [
          {
            columnId: 'COUNT(*)',
            fieldName: 'COUNT(*)',
            meta: {
              type: 'number',
            },
            inMetricDimension: true,
          },
          {
            columnId: 'BUCKET(@timestamp, 1 minute)',
            fieldName: 'BUCKET(@timestamp, 1 minute)',
            meta: {
              type: 'date',
            },
          },
        ],
      },
    },
    indexPatternRefs: [
      {
        id: '6176e654c875b9d3d9a3a69414fa44c561964cbb174a1f64f69e34eced7debac',
        title: 'logs-apm.error-default',
      },
    ],
  },
  datasourceId: 'textBased',
  columns: 2,
  changeType: 'unchanged',
};
